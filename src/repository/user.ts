import { prisma } from "../config/prisma";
import { Prisma } from "../generated/prisma/client";

class UserRepository {
  static findByEmail(email: string, select?: Prisma.UserSelect) {
    return prisma.user.findUnique({
      where: {
        email,
      },
      select,
    });
  }

  static findById(id: string, select?: Prisma.UserSelect) {
    return prisma.user.findUnique({
      where: {
        id,
      },
      select,
    });
  }

  static create(data: Prisma.UserCreateInput, select?: Prisma.UserSelect) {
    return prisma.user.create({
      data,
      select,
    });
  }

  static updateById(
    id: string,
    data: Prisma.UserUpdateInput,
    select?: Prisma.UserSelect,
  ) {
    return prisma.user.update({
      where: {
        id,
      },
      data,
      select,
    });
  }

  static deleteById(id: string, select?: Prisma.UserSelect) {
    return prisma.user.delete({
      where: {
        id,
      },
      select,
    });
  }

  static existsByEmail(email: string) {
    return prisma.user.count({
      where: {
        email,
      },
      take: 1,
    });
  }
}

export default UserRepository;
