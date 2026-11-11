// Configuração pública do Supabase (projeto convergascontrol).
// A anon key é segura no cliente — os dados são protegidos por RLS no banco.
// NOTA: hoje o app roda em modo SEM LOGIN (RLS liberado p/ anônimo). Auth por setor
// será reativada no futuro (ver migrate-nologin.sql no projeto convergas-control-spa).
window.CC_CONFIG = {
  supabaseUrl: 'https://ftwdwvthbigybggepcxn.supabase.co',
  supabaseAnon:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0d2R3dnRoYmlneWJnZ2VwY3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjE0NzEsImV4cCI6MjA5OTY5NzQ3MX0.c8cxETNa1T1XfXJZ4EEKmy6MMOi3QvpLJz3VKAq6gmw',
};
