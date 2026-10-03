const GRAPH_URL='https://graph.facebook.com/v19.0';

export async function exchangeCodeForToken(code){
 const params=new URLSearchParams({
   client_id:process.env.META_APP_ID,
   client_secret:process.env.META_APP_SECRET,
   redirect_uri:process.env.META_REDIRECT_URI,
   code
 });
 const res=await fetch(`${GRAPH_URL}/oauth/access_token?${params}`);
 const data=await res.json();
 if(data.error) throw new Error(data.error.message);
 return data.access_token;
}
export async function getLongLivedUserToken(shortToken){
 const params=new URLSearchParams({
   grant_type:'fb_exchange_token',
   client_id:process.env.META_APP_ID,
   client_secret:process.env.META_APP_SECRET,
   fb_exchange_token:shortToken
 });
 const res=await fetch(`${GRAPH_URL}/oauth/access_token?${params}`);
 return (await res.json()).access_token;
}
export async function listUserPages(userToken){
 const res=await fetch(`${GRAPH_URL}/me/accounts?access_token=${userToken}`);
 const data=await res.json();
 return data.data || [];
}
export async function sendCommentReply(commentId, message, pageToken){
 const res=await fetch(`${GRAPH_URL}/${commentId}/comments`,{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({ message, access_token: pageToken })
 });
 return res.json();
}
export async function sendMessengerMessage(psid, message, pageToken){
 const res=await fetch(`${GRAPH_URL}/me/messages?access_token=${pageToken}`,{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({ recipient:{id:psid}, message:{text:message} })
 });
 return res.json();
}