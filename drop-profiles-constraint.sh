#!/bin/bash
export DATABASE_URL="postgresql://postgres:nJoOBYXnG2psS3FL@db.cukjihbwuqknynsagzkc.supabase.co:5432/postgres"

# Drop all RLS policies
echo "DROP POLICY IF EXISTS \"Users can manage own business settings\" ON public.business_settings;" | npx prisma db execute --url "$DATABASE_URL" --stdin
echo "DROP POLICY IF EXISTS \"Users can manage own message templates\" ON public.message_templates;" | npx prisma db execute --url "$DATABASE_URL" --stdin
echo "DROP POLICY IF EXISTS \"Users can view own VIP contacts\" ON public.vip_contacts;" | npx prisma db execute --url "$DATABASE_URL" --stdin
echo "DROP POLICY IF EXISTS \"Users can manage own VIP contacts\" ON public.vip_contacts;" | npx prisma db execute --url "$DATABASE_URL" --stdin
echo "DROP POLICY IF EXISTS \"Users can view own call logs\" ON public.call_logs;" | npx prisma db execute --url "$DATABASE_URL" --stdin
echo "DROP POLICY IF EXISTS \"Users can manage own call logs\" ON public.call_logs;" | npx prisma db execute --url "$DATABASE_URL" --stdin
echo "DROP POLICY IF EXISTS \"Users can view own twilio config\" ON public.twilio_config;" | npx prisma db execute --url "$DATABASE_URL" --stdin
echo "DROP POLICY IF EXISTS \"Users can manage own twilio config\" ON public.twilio_config;" | npx prisma db execute --url "$DATABASE_URL" --stdin

# Disable RLS on all public tables
echo "ALTER TABLE IF EXISTS public.business_settings DISABLE ROW LEVEL SECURITY;" | npx prisma db execute --url "$DATABASE_URL" --stdin
echo "ALTER TABLE IF EXISTS public.message_templates DISABLE ROW LEVEL SECURITY;" | npx prisma db execute --url "$DATABASE_URL" --stdin
echo "ALTER TABLE IF EXISTS public.vip_contacts DISABLE ROW LEVEL SECURITY;" | npx prisma db execute --url "$DATABASE_URL" --stdin
echo "ALTER TABLE IF EXISTS public.call_logs DISABLE ROW LEVEL SECURITY;" | npx prisma db execute --url "$DATABASE_URL" --stdin
echo "ALTER TABLE IF EXISTS public.twilio_config DISABLE ROW LEVEL SECURITY;" | npx prisma db execute --url "$DATABASE_URL" --stdin
echo "ALTER TABLE IF EXISTS public.wallet DISABLE ROW LEVEL SECURITY;" | npx prisma db execute --url "$DATABASE_URL" --stdin
echo "ALTER TABLE IF EXISTS public.wallet_transactions DISABLE ROW LEVEL SECURITY;" | npx prisma db execute --url "$DATABASE_URL" --stdin

# Drop ALL tables in public schema to start fresh
echo "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" | npx prisma db execute --url "$DATABASE_URL" --stdin

echo "Schema reset successfully"
