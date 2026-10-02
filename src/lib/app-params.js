// MHI BizMate — app params stub (Backend Reset)
//
// The Base44 access-token plumbing was removed during the backend reset. This
// module now returns inert params so any residual import resolves. The new
// backend will use its own auth token mechanism.

export const appParams = {
  appId: "",
  token: "",
  functionsVersion: "",
  appBaseUrl: "",
};