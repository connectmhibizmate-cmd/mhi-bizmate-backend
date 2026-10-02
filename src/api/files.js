// MHI BizMate — File uploads service stub (Backend Reset). No storage connected.
export const filesApi = {
  uploadPublic: async () => null,
  uploadPrivate: async () => null,
  signedUrl: async (file_uri) => ({ signed_url: file_uri }),
};