export const userGroupsQueryKeyPrefix = ['groups', 'user'] as const;

export const userGroupsQueryKey = (identity: string) =>
  [...userGroupsQueryKeyPrefix, identity] as const;
