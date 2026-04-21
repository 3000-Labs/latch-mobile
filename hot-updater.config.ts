import { expo } from '@hot-updater/expo';
// import { supabaseDatabase, supabaseStorage } from "@hot-updater/supabase";
import { d1Database, r2Storage } from '@hot-updater/cloudflare';
import { config } from 'dotenv';
import { defineConfig } from 'hot-updater';

config({ path: '.env' });

export default defineConfig({
  build: expo(),
  storage: r2Storage({
    bucketName: process.env.HOT_UPDATER_CLOUDFLARE_R2_BUCKET_NAME!,
    accountId: process.env.HOT_UPDATER_CLOUDFLARE_ACCOUNT_ID!,
    cloudflareApiToken: process.env.HOT_UPDATER_CLOUDFLARE_API_TOKEN!,
  }),
  database: d1Database({
    databaseId: process.env.HOT_UPDATER_CLOUDFLARE_D1_DATABASE_ID!,
    accountId: process.env.HOT_UPDATER_CLOUDFLARE_ACCOUNT_ID!,
    cloudflareApiToken: process.env.HOT_UPDATER_CLOUDFLARE_API_TOKEN!,
  }),
  updateStrategy: 'appVersion', // or "fingerprint"
});
