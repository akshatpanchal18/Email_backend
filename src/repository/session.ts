import { prisma } from "../config/prisma";
import { Prisma } from "../generated/prisma/client";
class SessionRepository {
  static findById(id: string, select?: Prisma.SessionSelect) {
    return prisma.session.findUnique({
      where: {
        id,
      },
      select,
    });
  }

  static findByUserId(user_id: string, select?: Prisma.SessionSelect) {
    return prisma.session.findMany({
      where: {
        user_id,
      },
      select,
    });
  }

  static create(
    data: Prisma.SessionCreateInput,
    select?: Prisma.SessionSelect,
  ) {
    return prisma.session.create({
      data,
      select,
    });
  }

  static updateById(
    id: string,
    data: Prisma.SessionUpdateInput,
    select?: Prisma.SessionSelect,
  ) {
    return prisma.session.update({
      where: {
        id,
      },
      data,
      select,
    });
  }

  static deleteById(id: string, select?: Prisma.SessionSelect) {
    return prisma.session.delete({
      where: {
        id,
      },
      select,
    });
  }

  static deleteByUserId(user_id: string) {
    return prisma.session.deleteMany({
      where: {
        user_id,
      },
    });
  }

  static revokeById(id: string) {
    return prisma.session.update({
      where: {
        id,
      },
      data: {
        expiresAt: new Date(),
      },
    });
  }
}

export default SessionRepository;
