// Supabase 설정 (publishable key는 공개용 — RLS로 보호됨)
window.SB_URL = "https://nnbshhmfyqksnhpbszpn.supabase.co";
window.SB_KEY = "sb_publishable_UiwCgTF9YLbFwiRRJWMZ7g_fgg7qmaC";
window.sb = supabase.createClient(window.SB_URL, window.SB_KEY);
