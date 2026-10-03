import { getWorkspaceForPage, getDecryptedToken } from './connection.js';
import { sendCommentReply } from './client.js';
import { supabaseAdmin } from '../supabaseClient.js';

export async function handleCommentEvent(event){
 const conn=await getWorkspaceForPage(event.pageId);
 if(!conn) return;
 const token=getDecryptedToken(conn);
 
 // AI logic skip for now - simple auto reply example
 const reply="Thanks for your comment! Inbox e asun.";
 try{
   await sendCommentReply(event.commentId, reply, token);
   await supabaseAdmin.from('meta_processed_events').insert({ event_id:event.commentId, page_id:event.pageId, type:'comment' });
 }catch(e){ console.error('comment reply failed', e); }
}