import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushNotificationRequest {
  // Target users - provide one of these
  user_ids?: string[];          // Specific user IDs
  player_ids?: string[];        // Specific OneSignal player IDs
  exclude_user_id?: string;     // User to exclude (e.g., the sender)

  // Notification content
  title: string;
  message: string;
  url?: string;                 // Deep link URL

  // Notification type for preference checking
  notification_type:
    | 'new_post'
    | 'post_like'
    | 'post_comment'
    | 'comment_reply'
    | 'bookmarked_comment'
    | 'direct_message'
    | 'group_message'
    | 'chat_added'
    | 'chat_removed'
    | 'new_update'
    | 'new_event'
    | 'event_reminder'
    | 'new_user'
    | 'report';

  // Additional data to pass to app
  data?: Record<string, string>;
}

// Map notification types to preference column names
const preferenceMap: Record<string, string> = {
  'new_post': 'push_new_posts',
  'post_like': 'push_post_likes',
  'post_comment': 'push_post_comments',
  'comment_reply': 'push_comment_replies',
  'bookmarked_comment': 'push_bookmarked_comments',
  'direct_message': 'push_direct_messages',
  'group_message': 'push_group_messages',
  'chat_added': 'push_chat_added',
  'chat_removed': 'push_chat_removed',
  'new_update': 'push_new_updates',
  'new_event': 'push_new_events',
  'event_reminder': 'push_event_reminders',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: PushNotificationRequest = await req.json();
    console.log("Push notification request:", payload.notification_type, "Title:", payload.title);

    const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      throw new Error("OneSignal configuration missing");
    }

    // Debug: log key prefix to verify it's loaded
    console.log("OneSignal App ID:", ONESIGNAL_APP_ID);
    console.log("OneSignal Key prefix:", ONESIGNAL_REST_API_KEY?.substring(0, 15) + "...");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get target player IDs
    let targetPlayerIds: string[] = [];

    if (payload.player_ids && payload.player_ids.length > 0) {
      // Direct player IDs provided
      targetPlayerIds = payload.player_ids;
    } else if (payload.user_ids && payload.user_ids.length > 0) {
      // Get player IDs from user IDs, respecting preferences
      const preferenceColumn = preferenceMap[payload.notification_type];

      let query = supabase
        .from('user_notification_preferences')
        .select('user_id, onesignal_player_id')
        .in('user_id', payload.user_ids)
        .not('onesignal_player_id', 'is', null);

      // Filter by preference if applicable
      if (preferenceColumn) {
        query = query.eq(preferenceColumn, true);
      }

      const { data: prefs, error: prefError } = await query;

      if (prefError) {
        console.error("Error fetching preferences:", prefError);
        throw new Error("Failed to fetch user preferences");
      }

      // Filter out excluded user
      let filteredPrefs = prefs || [];
      if (payload.exclude_user_id) {
        filteredPrefs = filteredPrefs.filter(p => p.user_id !== payload.exclude_user_id);
      }

      targetPlayerIds = filteredPrefs
        .map(p => p.onesignal_player_id)
        .filter((id): id is string => id !== null);
    }

    if (targetPlayerIds.length === 0) {
      console.log("No target users with push enabled");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No target users with push enabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending push to ${targetPlayerIds.length} users`);

    // Build OneSignal notification (v1 API)
    const notification = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: targetPlayerIds,
      headings: { en: payload.title },
      contents: { en: payload.message },
      ...(payload.url && { url: payload.url }),
      ...(payload.data && { data: payload.data }),
    };

    // Send to OneSignal v1 API with Basic auth (same as working CardChase)
    console.log("Sending to OneSignal v1 API:", JSON.stringify(notification));

    const onesignalResponse = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notification),
    });

    if (!onesignalResponse.ok) {
      const errorText = await onesignalResponse.text();
      console.error("OneSignal API error:", errorText);
      throw new Error(`OneSignal API error: ${onesignalResponse.status}`);
    }

    const onesignalData = await onesignalResponse.json();
    console.log("OneSignal response:", onesignalData);

    return new Response(
      JSON.stringify({
        success: true,
        sent: targetPlayerIds.length,
        onesignal_id: onesignalData.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
