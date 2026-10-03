import { supabaseAdmin } from '../supabaseClient.js';
import { encryptToken, decryptToken } from './crypto.js';

export async function getWorkspaceForPage(pageId){
 const { data } = await supabaseAdmin.from('meta_connections').select('*').eq('page_id', pageId).eq('is_active', true).single();
 return data;
}
export async function getActivePage(workspaceId){
 const { data } = await supabaseAdmin.from('meta_connections').select('*').eq('workspace_id', workspaceId).eq('is_active', true).single();
 return data;
}
export async function connectPage({ workspaceId, pageId, pageName, accessToken, userId }){
 const encrypted = encryptToken(accessToken);
 const { data, error } = await supabaseAdmin.from('meta_connections').upsert({
   workspace_id: workspaceId,
   page_id: pageId,
   page_name: pageName,
   encrypted_access_token: encrypted,
   connected_by: userId,
   is_active: true,
   connected_at: new Date().toISOString()
 }, { onConflict: 'workspace_id,page_id' }).select().single();
 if(error) throw error;
 return data;
}
export function getDecryptedToken(connection){
 return decryptToken(connection.encrypted_access_token);
}