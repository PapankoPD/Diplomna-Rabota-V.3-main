export const hasPermission = (user, permission) => {
    if (!user || !user.permissions) return false;
    return user.permissions.some(p => p.name === permission);
};

export const hasRole = (user, role) => {
    if (!user || !user.roles) return false;
    return user.roles.some(r => r.name === role);
};

export const canEditMaterial = (user, material) => {
    if (!user || !material) return false;

    // Admin can edit anything
    if (hasRole(user, 'admin')) return true;

    // Owner can edit their own materials
    if (material.uploaded_by === user.id) return true;

    // Check for explicit edit permission
    return hasPermission(user, 'materials:edit');
};

export const canDeleteMaterial = (user, material) => {
    if (!user || !material) return false;

    // Admin can delete anything
    if (hasRole(user, 'admin')) return true;

    // Owner can delete their own materials
    if (material.uploaded_by === user.id) return true;

    // Check for explicit delete permission
    return hasPermission(user, 'materials:delete');
};

export const canViewMaterial = (user, material) => {
    if (!material) return false;

    // Public materials can be viewed by anyone
    if (material.is_public) return true;

    // Owner can always view their own materials
    if (user && material.uploaded_by === user.id) return true;

    // Admin can view anything
    if (user && hasRole(user, 'admin')) return true;

    // Check for explicit view permission
    return user && hasPermission(user, 'materials:read');
};
