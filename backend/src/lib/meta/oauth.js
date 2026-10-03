import { supabaseAdmin } from '../supabaseClient.js';
import { generateStateToken } from './crypto.js';

export async function generateOAuthUrl(workspaceId, userId){
 const state = generateStateToken();
 await supabaseAdmin.from('meta_oauth_states').insert({
   state,
   workspace_id: workspaceId,
   user_id: userId,
   expires_at: new Date(Date.now()+10*60*1000).toISOString()
 });
 const appId = process.env.META_APP_ID;
 const redirectUri = process.env.META_REDIRECT_URI;
 const scopes = 'pages_show_list,pages_read_engagement,pages_manage_metadata,pages_messaging';
 return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes}&response_type=code`;
}
export async function consumeState(state){
 const { data } = await supabaseAdmin.from('meta_oauth_states').select('*').eq('state', state).single();
 if(!data) throw new Error('Invalid state');
 await supabaseAdmin.from('meta_oauth_states').delete().eq('state', state);
 if(new Date(data.expires_at) < new Date()) throw new Error('State expired');
 return data;
}