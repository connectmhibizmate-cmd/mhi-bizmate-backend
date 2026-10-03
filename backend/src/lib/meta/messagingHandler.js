import { getWorkspaceForPage, getDecryptedToken } from './connection.js';
import { sendMessengerMessage } from './client.js';
import { supabaseAdmin } from '../supabaseClient.js';

export async function handleDmEvent(event){
 const conn=await getWorkspaceForPage(event.pageId);
 if(!conn) return;
 const token=getDecryptedToken(conn);
 const reply="Hello! Kivabe help korte pari?";
 try{
   await sendMessengerMessage(event.psid, reply, token);
   await supabaseAdmin.from('meta_processed_events').insert({ event_id:event.mid, page_id:event.pageId, type:'dm' });
 }catch(e){ console.error('dm failed', e); }
}