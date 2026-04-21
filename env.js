// @ts-check Type-check this file
const { z } = require('zod');

const runtimeEnv = z
  .object({
    EXPO_PUBLIC_API_BASE_URL: z.string().url(),
    // EXPO_PUBLIC_LOGIN_EMAIL: z.string(),
    // EXPO_PUBLIC_LOGIN_PASSWORD: z.string(),
    // EXPO_PUBLIC_DOJAH_KEY: z.string(),
    // EXPO_PUBLIC_DOJAH_APP_ID: z.string(),
    // EXPO_PUBLIC_DOJAH_WIDGET_ID: z.string(),
    EXPO_PUBLIC_HOT_UPDATER_SUPABASE_ANON_KEY: z.string(),
    EXPO_PUBLIC_HOT_UPDATER_SUPABASE_BUCKET_NAME: z.string(),
    EXPO_PUBLIC_HOT_UPDATER_SUPABASE_URL: z.string().url(),
    EXPO_PUBLIC_APP_ENV: z.string(),
    // EXPO_PUBLIC_META_APPLICATION_ID: z.string(),
    // EXPO_PUBLIC_META_CLIENT_TOKEN: z.string(),
    EXPO_PUBLIC_APP_PROFILE: z.string().default('staging'),
    // EXPO_PUBLIC_CLOUDFLARE_WORKER_URL: z.string().url(),
  })
  .partial();

const buildtimeEnv = runtimeEnv.partial().and(
  z.object({
    APP_NAME: z.string().default('Latch'),
    SSENTRY_AUTH_TOKEN: z.string().default('none'),
  }),
);

const envSchema =
  process.env.NODE_ENV === 'production'
    ? // @ts-expect-error
      /** @type {typeof buildtimeEnv} */ (runtimeEnv)
    : buildtimeEnv;

/**
 * `EXPO_PUBLIC` values need to be referenced directly e.g process.env.EXPO_PUBLIC_ID (not dynamically)
 * for the cli/transpiler to be able to inline this value, every other env is discarded in the build output
 * so only `EXPO_PUBLIC_*` are available to use at runtime while the rest are build time variables.
 *
 * @type {Record<keyof z.TypeOf<typeof runtimeEnv>, string | undefined>}
 */
const envObject = {
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  //   EXPO_PUBLIC_LOGIN_EMAIL: process.env.EXPO_PUBLIC_LOGIN_EMAIL,
  //   EXPO_PUBLIC_LOGIN_PASSWORD: process.env.EXPO_PUBLIC_LOGIN_PASSWORD,
  //   EXPO_PUBLIC_DOJAH_KEY: process.env.EXPO_PUBLIC_DOJAH_KEY,
  //   EXPO_PUBLIC_DOJAH_APP_ID: process.env.EXPO_PUBLIC_DOJAH_APP_ID,
  //   EXPO_PUBLIC_DOJAH_WIDGET_ID: process.env.EXPO_PUBLIC_DOJAH_WIDGET_ID,
  EXPO_PUBLIC_HOT_UPDATER_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_HOT_UPDATER_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_HOT_UPDATER_SUPABASE_BUCKET_NAME:
    process.env.EXPO_PUBLIC_HOT_UPDATER_SUPABASE_BUCKET_NAME,
  EXPO_PUBLIC_HOT_UPDATER_SUPABASE_URL: process.env.EXPO_PUBLIC_HOT_UPDATER_SUPABASE_URL,
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  //   EXPO_PUBLIC_META_APPLICATION_ID: process.env.EXPO_PUBLIC_META_APPLICATION_ID,
  //   EXPO_PUBLIC_META_CLIENT_TOKEN: process.env.EXPO_PUBLIC_META_CLIENT_TOKEN,
  EXPO_PUBLIC_APP_PROFILE: process.env.EXPO_PUBLIC_APP_PROFILE,
  //   EXPO_PUBLIC_CLOUDFLARE_WORKER_URL: process.env.EXPO_PUBLIC_CLOUDFLARE_WORKER_URL,
};
module.exports = envSchema.parse({ ...process.env, ...envObject });
