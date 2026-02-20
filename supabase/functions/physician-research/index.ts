import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { surgeon_id } = await req.json();
    console.log("Physician research for surgeon_id:", surgeon_id);

    if (!surgeon_id) {
      throw new Error("surgeon_id is required");
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY) throw new Error("Gemini API key not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY)
      throw new Error("Supabase configuration missing");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Fetch surgeon details
    const { data: surgeon, error: surgeonError } = await supabase
      .from("surgeons")
      .select(
        "full_name, first_name, last_name, npi, specialty, city, state, hospital, site_of_care"
      )
      .eq("id", surgeon_id)
      .single();

    if (surgeonError || !surgeon) {
      throw new Error(`Surgeon not found: ${surgeon_id}`);
    }

    const surgeonName =
      surgeon.full_name ||
      `${surgeon.first_name || ""} ${surgeon.last_name || ""}`.trim();
    const location = [surgeon.city, surgeon.state].filter(Boolean).join(", ");

    console.log("Researching:", surgeonName, location);

    // Build research prompt
    const prompt = `Research the following physician and compile a professional profile. Use web search to find current, accurate information.

Physician: ${surgeonName}
${surgeon.npi ? `NPI: ${surgeon.npi}` : ""}
${surgeon.specialty ? `Specialty: ${surgeon.specialty}` : ""}
${location ? `Location: ${location}` : ""}
${surgeon.hospital ? `Practice/Hospital: ${surgeon.hospital}` : ""}

Find and compile the following information. If you cannot find specific information, use null for that field. Be factual and concise.

Respond in this exact JSON format:
{
  "summary": "A 2-3 sentence professional summary of this physician",
  "medical_school": "Name of medical school and graduation year if available",
  "residency": "Residency program and institution",
  "fellowship": "Fellowship program and institution if applicable",
  "research_interests": "Key research areas or clinical interests",
  "publications": "Notable publications or publication count",
  "healthgrades_score": "Healthgrades rating if available (e.g. 4.5/5)",
  "news_pr": "Any recent news, awards, or notable mentions"
}

Important:
- Only include verified, factual information
- Use null for any field where information is not found
- Keep each field concise (1-2 sentences max)
- Do not fabricate or guess information`;

    // Call Gemini with web grounding
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const responseText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("Gemini response length:", responseText.length);

    // Parse JSON from response
    let profileData;
    try {
      let cleanText = responseText.trim();
      if (cleanText.startsWith("```")) {
        cleanText = cleanText
          .replace(/```json?\n?/g, "")
          .replace(/```/g, "")
          .trim();
      }
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        profileData = JSON.parse(jsonMatch[0]);
      } else {
        profileData = { summary: cleanText };
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      profileData = { summary: responseText.slice(0, 500) };
    }

    // Upsert to physician_profiles
    const profileRow = {
      surgeon_id,
      summary: profileData.summary || null,
      medical_school: profileData.medical_school || null,
      residency: profileData.residency || null,
      fellowship: profileData.fellowship || null,
      research_interests: profileData.research_interests || null,
      publications: profileData.publications || null,
      healthgrades_score: profileData.healthgrades_score || null,
      news_pr: profileData.news_pr || null,
      updated_at: new Date().toISOString(),
    };

    const { data: profile, error: upsertError } = await supabase
      .from("physician_profiles")
      .upsert(profileRow, { onConflict: "surgeon_id" })
      .select()
      .single();

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      throw new Error(`Failed to save profile: ${upsertError.message}`);
    }

    console.log("Profile saved for:", surgeonName);

    return new Response(
      JSON.stringify({ success: true, profile }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
