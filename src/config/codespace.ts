/**
 * Codespace Configuration
 * Settings for GitHub Codespaces development environment
 */

export const isCodespace = (): boolean => {
  return process.env.GITHUB_CODESPACES === 'true' || 
    !!process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
};

export const getCodespaceUrl = (): string => {
  return process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 
    'refactored-winner-x5px57rv9vv939p74.github.dev';
};

export const getWebSocketUrl = (): string => {
  const domain = getCodespaceUrl();
  return `wss://${domain}/ws`;
};

export const getApiBaseUrl = (): string => {
  const domain = getCodespaceUrl();
  return `https://${domain}/api`;
};

export const getRpcUrl = (): string => {
  const domain = getCodespaceUrl();
  return `https://${domain}/rpc`;
};

export const getIpfsGateway = (): string => {
  const domain = getCodespaceUrl();
  return `https://${domain}/ipfs`;
};

export default {
  isCodespace,
  getCodespaceUrl,
  getWebSocketUrl,
  getApiBaseUrl,
  getRpcUrl,
  getIpfsGateway
};
