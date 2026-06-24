import type { User } from "../types/user.types";

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

export function filterTeamUsers(users: User[], searchQuery: string): User[] {
  const normalizedQuery = normalizeSearchValue(searchQuery);

  if (!normalizedQuery) {
    return users;
  }

  return users.filter((user) => {
    const searchableValues = [
      user.displayName,
      user.email,
      user.role,
      user.isActive ? "active" : "inactive",
    ];

    return searchableValues.some((value) => value.toLowerCase().includes(normalizedQuery));
  });
}
