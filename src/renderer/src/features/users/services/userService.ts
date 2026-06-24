import { doc, getDoc, getDocs, query, where } from "firebase/firestore";

import { permissionService } from "../../permissions/services/permissionService";
import { firestoreCollectionService } from "../../firebase/services/firestoreCollectionService";
import { isUserRole, type User } from "../types/user.types";

interface UserDocumentData {
  id?: unknown;
  email?: unknown;
  displayName?: unknown;
  role?: unknown;
  isActive?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: unknown;
  updatedBy?: unknown;
}

function mapUserDocument(userId: string, data: UserDocumentData): User {
  if (
    typeof data.email !== "string" ||
    typeof data.displayName !== "string" ||
    !isUserRole(data.role) ||
    typeof data.isActive !== "boolean" ||
    !data.createdAt ||
    !data.updatedAt
  ) {
    throw new Error("A user profile is incomplete.");
  }

  return {
    id: userId,
    email: data.email,
    displayName: data.displayName,
    role: data.role,
    isActive: data.isActive,
    createdAt: data.createdAt as User["createdAt"],
    updatedAt: data.updatedAt as User["updatedAt"],
    createdBy: typeof data.createdBy === "string" ? data.createdBy : undefined,
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : undefined,
  };
}

function sortUsers(users: User[]): User[] {
  return [...users].sort((left, right) => left.displayName.localeCompare(right.displayName));
}

export const userService = {
  async getUserById(userId: string): Promise<User> {
    const userSnapshot = await getDoc(doc(firestoreCollectionService.getUsersCollection(), userId));

    if (!userSnapshot.exists()) {
      throw new Error("No Fresh Prints user profile exists for this account.");
    }

    return mapUserDocument(userSnapshot.id, userSnapshot.data());
  },

  async listTeamUsers(caller: User): Promise<User[]> {
    const readableRoles = permissionService.getReadableTeamUserRoles(caller);

    if (readableRoles.length === 0) {
      return [];
    }

    const usersQuery = query(
      firestoreCollectionService.getUsersCollection(),
      where("role", "in", readableRoles),
    );
    const snapshot = await getDocs(usersQuery);

    return sortUsers(
      snapshot.docs.map((userDocument) => mapUserDocument(userDocument.id, userDocument.data())),
    );
  },
};
