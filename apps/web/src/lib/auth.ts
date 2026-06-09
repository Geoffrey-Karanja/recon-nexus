export const saveToken = (token: string) => localStorage.setItem('recon_token', token)
export const getToken = () => localStorage.getItem('recon_token')
export const clearToken = () => localStorage.removeItem('recon_token')
