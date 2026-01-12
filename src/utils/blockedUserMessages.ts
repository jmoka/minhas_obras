export const BLOCKED_USER_MESSAGES = {
  generalAccess: '🔒 Sua conta precisa de aprovação. Solicite o desbloqueio via WhatsApp!',
  myGallery: '🎨 Para criar e gerenciar suas obras, solicite a aprovação da sua conta primeiro!',
  profile: '👤 Para editar seu perfil, você precisa de aprovação. Clique no botão do WhatsApp!',
  addArtwork: '➕ Para adicionar obras, sua conta precisa ser aprovada pelo administrador.',
  adminArea: '⚙️ Área administrativa requer aprovação. Entre em contato via WhatsApp.',
  editArtwork: '✏️ Para editar obras, solicite aprovação via WhatsApp!',
  analytics: '📊 Analytics disponível após aprovação da conta.',
} as const;

export const getBlockedMessage = (route: string): string => {
  if (route.includes('/my-gallery')) return BLOCKED_USER_MESSAGES.myGallery;
  if (route.includes('/profile')) return BLOCKED_USER_MESSAGES.profile;
  if (route.includes('/admin/new-obra')) return BLOCKED_USER_MESSAGES.addArtwork;
  if (route.includes('/admin/edit-obra')) return BLOCKED_USER_MESSAGES.editArtwork;
  if (route.includes('/admin/analytics')) return BLOCKED_USER_MESSAGES.analytics;
  if (route.includes('/admin')) return BLOCKED_USER_MESSAGES.adminArea;
  return BLOCKED_USER_MESSAGES.generalAccess;
};
