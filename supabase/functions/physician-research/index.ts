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
    const institution = surgeon.hospital || "";

    console.log("Researching:", surgeonName, location);

    // Build research prompt - Medical Sales Intelligence Agent
    const prompt = `# Role
You are a Medical Sales Intelligence Agent. Your goal is to generate a concise "Pre-Call Flashcard" for a medical device sales representative. You focus on conversation starters, clinical pedigree, and high-value background intel.

# INPUTS
Physician Name: ${surgeonName}
${surgeon.npi ? `NPI: ${surgeon.npi}` : ""}
${surgeon.specialty ? `Medical Specialty: ${surgeon.specialty}` : ""}
${institution ? `Institution: ${institution}` : ""}
${location ? `City/Location: ${location}` : ""}

# Search Strategy
1. Identify the Target: Find the physician's official bio on their practice or hospital website.
2. Extract Education: specifically isolate Medical School, Residency, and Fellowship.
3. Identify "Hooks": Look for personal details in the bio (hobbies, hometown, sports), specific clinical interests (e.g., "anterior hip approach," "robotic surgery"), or recent research themes.
4. CMS Data: Generate the Open Payments search URL.

# Output Rules
- Format: Concise bullet points only. No long paragraphs.
- Content: Only include what a sales rep can use to build rapport or qualify the target.
- Only include verified, factual information.
- Use null for any field where information is not found.
- Do not fabricate or guess information.
- Keep each field to 1-2 short sentences max.

Respond in this exact JSON format:
{
  "summary": "2-3 sentence professional summary focused on what matters to a sales rep",
  "medical_school": "School name and graduation year if available",
  "residency": "Institution and program",
  "fellowship": "Institution and specialty if applicable",
  "clinical_specialties": "3-4 specific focus areas, e.g. Sports Medicine, Joint Replacement",
  "key_procedures": "Specific techniques mentioned, e.g. MAKO Robotics, Minimally Invasive Spine",
  "research_interests": "1-2 keywords on what they study",
  "ice_breakers": "Personal hobbies, community roles, fun facts, hometown, sports. If none found, use 'Standard professional bio only.'",
  "publications": "Notable publications or publication count",
  "healthgrades_score": "Healthgrades rating if available (e.g. 4.5/5)",
  "news_pr": "Any recent awards, unique leadership roles, or notable mentions",
  "cms_url": "https://openpaymentsdata.cms.gov/search",
  "source_url": "Link to the primary bio source used"
}`;

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
            maxOutputTokens: 4096,
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

    // Clean "null" strings to actual null
    const clean = (v: unknown) => {
      if (v == null) return null;
      if (typeof v === "string") {
        const t = v.trim().toLowerCase();
        if (t === "null" || t === "n/a" || t === "none" || t === "") return null;
      }
      return v as string;
    };

    // Upsert to physician_profiles
    const profileRow = {
      surgeon_id,
      summary: clean(profileData.summary),
      medical_school: clean(profileData.medical_school),
      residency: clean(profileData.residency),
      fellowship: clean(profileData.fellowship),
      research_interests: clean(profileData.research_interests),
      publications: clean(profileData.publications),
      healthgrades_score: clean(profileData.healthgrades_score),
      news_pr: clean(profileData.news_pr),
      ice_breakers: clean(profileData.ice_breakers),
      key_procedures: clean(profileData.key_procedures),
      clinical_specialties: clean(profileData.clinical_specialties),
      cms_url: clean(profileData.cms_url),
      source_url: clean(profileData.source_url),
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
