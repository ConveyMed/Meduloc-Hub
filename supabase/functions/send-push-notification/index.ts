import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushNotificationRequest {
  // Target the recipients with ONE of these (in priority order):
  external_user_ids?: string[]; // App user IDs -> delivered by OneSignal external_id (update-proof)
  user_ids?: string[];          // App user IDs -> preference-filtered here, then by external_id
  player_ids?: string[];        // Raw OneSignal subscription IDs (legacy fallback)
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

// Types only admins/owners may send (they fan out to every user, and only
// admins can create updates/events under RLS).
const ADMIN_ONLY_TYPES = new Set(['new_update', 'new_event']);
// Types that must stay inside a chat the caller belongs to.
const CHAT_TYPES = new Set(['direct_message', 'group_message', 'chat_member_added', 'chat_member_removed']);
// Types tied to a post that must exist.
const POST_TYPES = new Set(['new_post', 'post_liked', 'post_commented', 'comment_replied']);
// Types whose recipients must all be admins/owners.
const ADMIN_TARGET_TYPES = new Set(['new_user_joined', 'conversation_reported', 'event_rsvp']);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error("Supabase configuration missing");
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ---- Caller must be a signed-in user ----
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: authData, error: authError } = token
      ? await supabase.auth.getUser(token)
      : { data: { user: null }, error: new Error("no token") };
    const caller = authData?.user;
    if (authError || !caller) {
      return json({ success: false, error: "Unauthorized" }, 401);
    }

    const { data: callerProfile } = await supabase
      .from('users')
      .select('is_admin, is_owner')
      .eq('id', caller.id)
      .maybeSingle();
    const callerIsAdmin = callerProfile?.is_admin === true || callerProfile?.is_owner === true;

    const payload: PushNotificationRequest = await req.json();
    const pushType = String(payload.data?.type || payload.notification_type || '');
    console.log("Push notification request, type:", pushType, "admin:", callerIsAdmin);

    // Keep content to push-sized text.
    payload.title = String(payload.title || '').slice(0, 120);
    payload.message = String(payload.message || '').slice(0, 300);

    // ---- Non-admins may only send the in-app notifications the app itself makes ----
    if (!callerIsAdmin) {
      const deny = (reason: string) => {
        console.warn("Push denied:", reason, "caller:", caller.id);
        return json({ success: false, error: "Forbidden" }, 403);
      };

      if (ADMIN_ONLY_TYPES.has(pushType)) return deny("admin-only type");
      if (payload.player_ids?.length) return deny("raw subscription ids");

      const recipients = [...new Set([
        ...(payload.external_user_ids || []),
        ...(payload.user_ids || []),
      ])].filter(id => id && id !== caller.id);

      if (CHAT_TYPES.has(pushType)) {
        const chatId = payload.data?.chat_id;
        if (!chatId) return deny("missing chat_id");
        const { data: members } = await supabase
          .from('chat_members')
          .select('user_id')
          .eq('chat_id', chatId);
        const memberIds = new Set((members || []).map(m => m.user_id));
        if (!memberIds.has(caller.id)) return deny("caller not in chat");
        // A removed member has already left the chat, so only check the others.
        if (pushType !== 'chat_member_removed' && recipients.some(id => !memberIds.has(id))) {
          return deny("recipient not in chat");
        }
        if (pushType === 'chat_member_removed' && recipients.length > 1) {
          return deny("too many recipients");
        }
      } else if (POST_TYPES.has(pushType)) {
        const postId = payload.data?.post_id;
        if (!postId) return deny("missing post_id");
        const { data: post } = await supabase
          .from('posts')
          .select('id, user_id')
          .eq('id', postId)
          .maybeSingle();
        if (!post) return deny("post not found");
        if (pushType === 'new_post' && post.user_id !== caller.id) return deny("not the post author");
        if (pushType === 'post_liked' && (recipients.length > 1 || (recipients[0] && recipients[0] !== post.user_id))) {
          return deny("like recipient is not the post author");
        }
        if (pushType === 'comment_replied' && recipients.length > 1) return deny("too many recipients");
      } else if (ADMIN_TARGET_TYPES.has(pushType)) {
        if (recipients.length) {
          const { data: admins } = await supabase
            .from('users')
            .select('id')
            .in('id', recipients)
            .or('is_admin.eq.true,is_owner.eq.true');
          const adminIds = new Set((admins || []).map(a => a.id));
          if (recipients.some(id => !adminIds.has(id))) return deny("recipient is not an admin");
        }
      } else {
        return deny("unknown type");
      }

      // Recipients must be real app users.
      if (recipients.length) {
        const { data: known } = await supabase.from('users').select('id').in('id', recipients);
        const knownIds = new Set((known || []).map(u => u.id));
        if (recipients.some(id => !knownIds.has(id))) return deny("unknown recipient");
      }
    }

    const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      throw new Error("OneSignal configuration missing");
    }

    // ---- Resolve the targeting fields for the OneSignal notification ----
    // Preferred path: target by external_id (= app user id). The app calls
    // OneSignal.login(userId), so OneSignal maps each external_id to that
    // user's CURRENT subscription(s). Targeting this way means push survives
    // app updates / reinstalls / new devices without ever storing or chasing
    // subscription IDs that change underneath us.
    let externalIds: string[] = [];
    let subscriptionIds: string[] = [];

    if (payload.external_user_ids && payload.external_user_ids.length > 0) {
      // Caller already applied preferences/targeting — send straight through.
      externalIds = [...new Set(
        payload.external_user_ids.filter(id => id && id !== payload.exclude_user_id)
      )];
    } else if (payload.user_ids && payload.user_ids.length > 0) {
      // Apply the per-type preference here, then target the survivors by id.
      const preferenceColumn = preferenceMap[payload.notification_type];
      let allowedUserIds = payload.user_ids.filter(id => id !== payload.exclude_user_id);

      if (preferenceColumn && allowedUserIds.length > 0) {
        const { data: prefs, error: prefError } = await supabase
          .from('user_notification_preferences')
          .select(`user_id, ${preferenceColumn}`)
          .in('user_id', allowedUserIds);

        if (prefError) {
          console.error("Error fetching preferences:", prefError);
          throw new Error("Failed to fetch user preferences");
        }

        // No row = opted in by default; only drop EXPLICIT false.
        const disabled = new Set(
          (prefs || []).filter(p => p[preferenceColumn] === false).map(p => p.user_id)
        );
        allowedUserIds = allowedUserIds.filter(id => !disabled.has(id));
      }
      externalIds = [...new Set(allowedUserIds)];
    } else if (payload.player_ids && payload.player_ids.length > 0) {
      // Legacy fallback: raw subscription IDs.
      subscriptionIds = [...new Set(payload.player_ids)];
    }

    if (externalIds.length === 0 && subscriptionIds.length === 0) {
      console.log("No recipients to send to");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No recipients to send to" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetCount = externalIds.length || subscriptionIds.length;
    console.log(`Sending push to ${targetCount} ${externalIds.length ? 'users (external_id)' : 'subscriptions'}`);

    // Build OneSignal notification (v1 API)
    const notification: Record<string, unknown> = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: payload.title },
      contents: { en: payload.message },
      ...(payload.url && { url: payload.url }),
      ...(payload.data && { data: payload.data }),
    };
    if (externalIds.length > 0) {
      notification.include_external_user_ids = externalIds;
      notification.channel_for_external_user_ids = "push";
    } else {
      notification.include_subscription_ids = subscriptionIds;
    }

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
    console.log("OneSignal notification sent, id:", onesignalData.id);

    return new Response(
      JSON.stringify({
        success: true,
        sent: targetCount,
        onesignal_id: onesignalData.id,
        result: onesignalData,
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
