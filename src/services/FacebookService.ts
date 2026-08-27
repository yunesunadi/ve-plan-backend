const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || "v23.0";
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

export interface FacebookProfile {
  id: string;
  name: string;
  email?: string;
  picture?: string;
}

export type FacebookVerifyResult =
  | { ok: true; profile: FacebookProfile }
  | { ok: false; message: string };

export async function verifyAccessToken(accessToken: string): Promise<FacebookVerifyResult> {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    return { ok: false, message: "Facebook login is not configured." };
  }

  const appAccessToken = `${appId}|${appSecret}`;

  let debugData: any;
  try {
    const debugRes = await fetch(
      `${GRAPH_URL}/debug_token?input_token=${encodeURIComponent(accessToken)}` +
      `&access_token=${encodeURIComponent(appAccessToken)}`
    );
    debugData = (await debugRes.json())?.data;
  } catch {
    return { ok: false, message: "Could not reach Facebook to verify the login." };
  }

  if (!debugData?.is_valid || String(debugData.app_id) !== String(appId)) {
    return { ok: false, message: "Invalid or expired Facebook access token." };
  }

  let me: any;
  try {
    const meRes = await fetch(
      `${GRAPH_URL}/me?fields=id,name,email,picture.type(large)` +
      `&access_token=${encodeURIComponent(accessToken)}`
    );
    me = await meRes.json();
    if (!meRes.ok || me?.error) {
      return { ok: false, message: "Could not read your Facebook profile." };
    }
  } catch {
    return { ok: false, message: "Could not reach Facebook to read your profile." };
  }

  if (!me?.id) {
    return { ok: false, message: "Could not read your Facebook profile." };
  }

  return {
    ok: true,
    profile: {
      id: me.id,
      name: me.name,
      email: me.email,
      picture: me.picture?.data?.url,
    },
  };
}
