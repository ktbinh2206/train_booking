import Decimal from 'decimal.js';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { hashPassword } from '../lib/password';
import { createBooking as createBookingBusiness, payBooking as payBookingBusiness } from './bookingService';

type PaginationInput = {
  page?: number;
  pageSize?: number;
};

function normalizePagination(input: PaginationInput) {
  const page = Number.isFinite(input.page) && (input.page ?? 0) > 0 ? Number(input.page) : 1;
  const pageSize = Number.isFinite(input.pageSize) && (input.pageSize ?? 0) > 0
    ? Math.min(Number(input.pageSize), 100)
    : 10;
  const skip = (page - 1) * pageSize;

  return {
    page,
    pageSize,
    skip
  };
}

function toPageResult<T>(items: T[], total: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    data: items,
    items,
    page,
    pageSize,
    total,
    totalPages
  };
}

export async function listStationsAdmin(input: PaginationInput) {
  const { page, pageSize, skip } = normalizePagination(input);
  const [total, items] = await Promise.all([
    prisma.station.count(),
    prisma.station.findMany({
      orderBy: [{ code: 'asc' }],
      skip,
      take: pageSize
    })
  ]);

  return toPageResult(items, total, page, pageSize);
}

export async function getStationByIdAdmin(stationId: string) {
  const station = await prisma.station.findUnique({ where: { id: stationId } });
  if (!station) {
    throw new AppError('Không tìm thấy ga.', 404);
  }
  return station;
}

export async function createStationAdmin(input: { code: string; name: string; city: string }) {
  return prisma.station.create({
    data: {
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      city: input.city.trim()
    }
  });
}

export async function updateStationAdmin(stationId: string, input: { code?: string; name?: string; city?: string }) {
  const data: Record<string, string> = {};
  if (input.code !== undefined) data.code = input.code.trim().toUpperCase();
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.city !== undefined) data.city = input.city.trim();

  return prisma.station.update({
    where: { id: stationId },
    data
  });
}

export async function deleteStationAdmin(stationId: string) {
  await prisma.station.delete({ where: { id: stationId } });
  return { success: true };
}

export async function listTrainsAdmin(input: PaginationInput) {
  const { page, pageSize, skip } = normalizePagination(input);
  const [total, items] = await Promise.all([
    prisma.train.count(),
    prisma.train.findMany({
      include: {
        carriages: {
          include: {
            seats: {
              select: {
                id: true
              }
            },
            _count: {
              select: {
                seats: true
              }
            }
          },
          orderBy: {
            orderIndex: 'asc'
          }
        },
        _count: {
          select: {
            trips: true
          }
        }
      },
      orderBy: [{ code: 'asc' }],
      skip,
      take: pageSize
    })
  ]);

  const data = items.map((train) => {
    const totalCarriages = train.carriages.length;
    const totalSeats = train.carriages.reduce((sum, carriage) => sum + carriage._count.seats, 0);
    const carriagePrices = train.carriages.map((carriage) => Number(carriage.basePrice.toString()));
    const minPrice = carriagePrices.length > 0 ? Math.min(...carriagePrices) : null;
    const maxPrice = carriagePrices.length > 0 ? Math.max(...carriagePrices) : null;

    return {
      ...train,
      carriageCount: totalCarriages,
      seatCount: totalSeats,
      minCarriagePrice: minPrice,
      maxCarriagePrice: maxPrice
    };
  });

  return toPageResult(data, total, page, pageSize);
}

export async function getTrainByIdAdmin(trainId: string) {
  const train = await prisma.train.findUnique({
    where: { id: trainId },
    include: {
      carriages: {
        include: {
          seats: {
            orderBy: {
              orderIndex: 'asc'
            }
          }
        },
        orderBy: {
          orderIndex: 'asc'
        }
      }
    }
  });

  if (!train) {
    throw new AppError('Không tìm thấy tàu.', 404);
  }

  return {
    ...train,
    carriages: train.carriages.map((carriage) => ({
      ...carriage,
      seatCount: carriage.seats.length
    }))
  };
}

export async function createTrainAdmin(input: { code: string; name: string }) {
  return prisma.train.create({
    data: {
      code: input.code.trim().toUpperCase(),
      name: input.name.trim()
    }
  });
}

export async function updateTrainAdmin(trainId: string, input: { code?: string; name?: string }) {
  const data: Record<string, string> = {};
  if (input.code !== undefined) data.code = input.code.trim().toUpperCase();
  if (input.name !== undefined) data.name = input.name.trim();

  return prisma.train.update({
    where: { id: trainId },
    data
  });
}

export async function deleteTrainAdmin(trainId: string) {
  await prisma.train.delete({ where: { id: trainId } });
  return { success: true };
}

export async function listCarriagesAdmin(input: PaginationInput & { trainId?: string }) {
  const { page, pageSize, skip } = normalizePagination(input);
  const where = input.trainId ? { trainId: input.trainId } : undefined;

  const [total, items] = await Promise.all([
    prisma.carriage.count({ where }),
    prisma.carriage.findMany({
      where,
      include: {
        train: true,
        _count: {
          select: {
            seats: true
          }
        }
      },
      orderBy: [{ train: { code: 'asc' } }, { orderIndex: 'asc' }],
      skip,
      take: pageSize
    })
  ]);

  return toPageResult(items, total, page, pageSize);
}

export async function getCarriageByIdAdmin(carriageId: string) {
  const carriage = await prisma.carriage.findUnique({
    where: { id: carriageId },
    include: {
      train: true,
      seats: {
        orderBy: {
          orderIndex: 'asc'
        }
      }
    }
  });

  if (!carriage) {
    throw new AppError('Không tìm thấy toa.', 404);
  }

  return carriage;
}

export async function createCarriageAdmin(input: {
  trainId: string;
  code: string;
  orderIndex: number;
  type: 'SOFT_SEAT' | 'HARD_SEAT' | 'SLEEPER';
  basePrice?: number;
  layoutJson?: unknown;
}) {
  const train = await prisma.train.findUnique({ where: { id: input.trainId } });
  if (!train) {
    throw new AppError('Tàu không tồn tại.', 404);
  }

  return prisma.carriage.create({
    data: {
      trainId: input.trainId,
      code: input.code.trim().toUpperCase(),
      orderIndex: input.orderIndex,
      type: input.type,
      basePrice: input.basePrice === undefined ? undefined : new Decimal(input.basePrice),
      layoutJson: input.layoutJson as never
    }
  });
}

export async function updateCarriageAdmin(
  carriageId: string,
  input: {
    code?: string;
    orderIndex?: number;
    type?: 'SOFT_SEAT' | 'HARD_SEAT' | 'SLEEPER';
    basePrice?: number;
    layoutJson?: unknown;
  }
) {
  const data: Record<string, unknown> = {};
  if (input.code !== undefined) data.code = input.code.trim().toUpperCase();
  if (input.orderIndex !== undefined) data.orderIndex = input.orderIndex;
  if (input.type !== undefined) data.type = input.type;
  if (input.basePrice !== undefined) data.basePrice = new Decimal(input.basePrice);
  if (input.layoutJson !== undefined) data.layoutJson = input.layoutJson as never;

  return prisma.carriage.update({
    where: { id: carriageId },
    data
  });
}

export async function deleteCarriageAdmin(carriageId: string) {
  await prisma.carriage.delete({ where: { id: carriageId } });
  return { success: true };
}

export async function listSeatsAdmin(input: PaginationInput & { carriageId?: string }) {
  const { page, pageSize, skip } = normalizePagination(input);
  const where = input.carriageId ? { carriageId: input.carriageId } : undefined;

  const [total, items] = await Promise.all([
    prisma.seat.count({ where }),
    prisma.seat.findMany({
      where,
      include: {
        carriage: {
          include: {
            train: true
          }
        }
      },
      orderBy: [{ carriage: { orderIndex: 'asc' } }, { orderIndex: 'asc' }],
      skip,
      take: pageSize
    })
  ]);

  return toPageResult(items, total, page, pageSize);
}

export async function getSeatByIdAdmin(seatId: string) {
  const seat = await prisma.seat.findUnique({
    where: { id: seatId },
    include: {
      carriage: {
        include: {
          train: true
        }
      }
    }
  });

  if (!seat) {
    throw new AppError('Không tìm thấy ghế.', 404);
  }

  return seat;
}

export async function createSeatAdmin(input: {
  carriageId: string;
  code: string;
  orderIndex: number;
  status?: 'ACTIVE' | 'INACTIVE';
  price?: number | null;
}) {
  const carriage = await prisma.carriage.findUnique({ where: { id: input.carriageId } });
  if (!carriage) {
    throw new AppError('Toa không tồn tại.', 404);
  }

  return prisma.seat.create({
    data: {
      carriageId: input.carriageId,
      code: input.code.trim().toUpperCase(),
      orderIndex: input.orderIndex,
      status: input.status ?? 'ACTIVE',
      price: input.price === undefined || input.price === null ? null : new Decimal(input.price)
    }
  });
}

export async function updateSeatAdmin(
  seatId: string,
  input: {
    code?: string;
    orderIndex?: number;
    status?: 'ACTIVE' | 'INACTIVE';
    price?: number | null;
  }
) {
  const data: Record<string, unknown> = {};
  if (input.code !== undefined) data.code = input.code.trim().toUpperCase();
  if (input.orderIndex !== undefined) data.orderIndex = input.orderIndex;
  if (input.status !== undefined) data.status = input.status;
  if (input.price !== undefined) data.price = input.price === null ? null : new Decimal(input.price);

  return prisma.seat.update({
    where: { id: seatId },
    data
  });
}

export async function deleteSeatAdmin(seatId: string) {
  await prisma.seat.delete({ where: { id: seatId } });
  return { success: true };
}

export async function listTripsAdmin(input: PaginationInput) {
  const { page, pageSize, skip } = normalizePagination(input);
  const [total, items] = await Promise.all([
    prisma.trip.count(),
    prisma.trip.findMany({
      include: {
        train: true,
        originStation: true,
        destinationStation: true,
        _count: {
          select: {
            bookings: true
          }
        }
      },
      orderBy: [{ departureTime: 'asc' }],
      skip,
      take: pageSize
    })
  ]);

  return toPageResult(items, total, page, pageSize);
}

export async function getTripByIdAdmin(tripId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      train: true,
      originStation: true,
      destinationStation: true,
      bookings: {
        include: {
          user: true,
          bookingSeats: {
            include: {
              seat: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  });

  if (!trip) {
    throw new AppError('Không tìm thấy chuyến.', 404);
  }

  return trip;
}

export async function createTripAdmin(input: {
  trainId: string;
  originStationId: string;
  destinationStationId: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  status?: 'ON_TIME' | 'DELAYED' | 'CANCELLED';
  delayMinutes?: number;
  note?: string | null;
}) {
  const [train, originStation, destinationStation] = await Promise.all([
    prisma.train.findUnique({ where: { id: input.trainId } }),
    prisma.station.findUnique({ where: { id: input.originStationId } }),
    prisma.station.findUnique({ where: { id: input.destinationStationId } })
  ]);

  if (!train) throw new AppError('Tàu không tồn tại.', 404);
  if (!originStation) throw new AppError('Ga đi không tồn tại.', 404);
  if (!destinationStation) throw new AppError('Ga đến không tồn tại.', 404);
  if (originStation.id === destinationStation.id) throw new AppError('Ga đi và ga đến phải khác nhau.', 400);

  return prisma.trip.create({
    data: {
      trainId: train.id,
      originStationId: originStation.id,
      destinationStationId: destinationStation.id,
      origin: originStation.name,
      destination: destinationStation.name,
      departureTime: new Date(input.departureTime),
      arrivalTime: new Date(input.arrivalTime),
      price: new Decimal(input.price),
      status: input.status ?? 'ON_TIME',
      delayMinutes: input.delayMinutes ?? 0,
      note: input.note ?? null
    },
    include: {
      train: true,
      originStation: true,
      destinationStation: true
    }
  });
}

export async function updateTripAdmin(
  tripId: string,
  input: {
    trainId?: string;
    originStationId?: string;
    destinationStationId?: string;
    departureTime?: string;
    arrivalTime?: string;
    price?: number;
    status?: 'ON_TIME' | 'DELAYED' | 'CANCELLED';
    delayMinutes?: number;
    note?: string | null;
  }
) {
  const data: Record<string, unknown> = {};

  if (input.trainId !== undefined) {
    const train = await prisma.train.findUnique({ where: { id: input.trainId } });
    if (!train) throw new AppError('Tàu không tồn tại.', 404);
    data.trainId = train.id;
  }

  let originStationName: string | undefined;
  let destinationStationName: string | undefined;

  if (input.originStationId !== undefined) {
    const originStation = await prisma.station.findUnique({ where: { id: input.originStationId } });
    if (!originStation) throw new AppError('Ga đi không tồn tại.', 404);
    data.originStationId = originStation.id;
    originStationName = originStation.name;
  }

  if (input.destinationStationId !== undefined) {
    const destinationStation = await prisma.station.findUnique({ where: { id: input.destinationStationId } });
    if (!destinationStation) throw new AppError('Ga đến không tồn tại.', 404);
    data.destinationStationId = destinationStation.id;
    destinationStationName = destinationStation.name;
  }

  if (originStationName !== undefined) data.origin = originStationName;
  if (destinationStationName !== undefined) data.destination = destinationStationName;

  if (input.departureTime !== undefined) data.departureTime = new Date(input.departureTime);
  if (input.arrivalTime !== undefined) data.arrivalTime = new Date(input.arrivalTime);
  if (input.price !== undefined) data.price = new Decimal(input.price);
  if (input.status !== undefined) data.status = input.status;
  if (input.delayMinutes !== undefined) data.delayMinutes = input.delayMinutes;
  if (input.note !== undefined) data.note = input.note;

  return prisma.trip.update({
    where: { id: tripId },
    data,
    include: {
      train: true,
      originStation: true,
      destinationStation: true
    }
  });
}

export async function deleteTripAdmin(tripId: string) {
  const bookingCount = await prisma.booking.count({
    where: {
      tripId
    }
  });

  if (bookingCount > 0) {
    throw new AppError('Cannot delete trip with existing bookings', 409);
  }

  await prisma.trip.delete({ where: { id: tripId } });
  return { success: true };
}

export async function listBookingsAdmin(input: PaginationInput) {
  const { page, pageSize, skip } = normalizePagination(input);
  const [total, items] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.findMany({
      include: {
        user: true,
        trip: {
          include: {
            train: true
          }
        },
        bookingSeats: {
          include: {
            seat: true
          }
        },
        payment: true,
        ticket: true
      },
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take: pageSize
    })
  ]);

  return toPageResult(items, total, page, pageSize);
}

export async function getBookingByIdAdmin(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: true,
      trip: {
        include: {
          train: true,
          originStation: true,
          destinationStation: true
        }
      },
      bookingSeats: {
        include: {
          seat: {
            include: {
              carriage: true
            }
          }
        }
      },
      payment: true,
      ticket: true
    }
  });

  if (!booking) {
    throw new AppError('Không tìm thấy booking.', 404);
  }

  return booking;
}

export async function createBookingAdmin(input: {
  userId: string;
  tripId: string;
  seatIds: string[];
  contactEmail: string;
  markAsPaid?: boolean;
}) {
  const booking = await createBookingBusiness({
    userId: input.userId,
    tripId: input.tripId,
    seatIds: input.seatIds,
    contactEmail: input.contactEmail
  });

  if (input.markAsPaid) {
    return payBookingBusiness(booking.id);
  }

  return booking;
}

export async function updateBookingAdmin(
  bookingId: string,
  input: {
    status?: 'HOLDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';
    contactEmail?: string;
  }
) {
  const data: Record<string, unknown> = {};
  if (input.status !== undefined) data.status = input.status;
  if (input.contactEmail !== undefined) data.contactEmail = input.contactEmail.trim().toLowerCase();

  return prisma.booking.update({
    where: { id: bookingId },
    data,
    include: {
      user: true,
      trip: {
        include: {
          train: true
        }
      },
      bookingSeats: {
        include: {
          seat: true
        }
      },
      payment: true,
      ticket: true
    }
  });
}

export async function deleteBookingAdmin(bookingId: string) {
  await prisma.booking.delete({ where: { id: bookingId } });
  return { success: true };
}

export async function listTicketsAdmin(input: PaginationInput) {
  const { page, pageSize, skip } = normalizePagination(input);
  const [total, items] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.findMany({
      include: {
        booking: {
          include: {
            user: true,
            trip: {
              include: {
                train: true
              }
            },
            bookingSeats: {
              include: {
                seat: true
              }
            },
            payment: true
          }
        }
      },
      orderBy: [{ issuedAt: 'desc' }],
      skip,
      take: pageSize
    })
  ]);

  return toPageResult(items, total, page, pageSize);
}

export async function getTicketByIdAdmin(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      booking: {
        include: {
          user: true,
          trip: {
            include: {
              train: true
            }
          },
          bookingSeats: {
            include: {
              seat: true
            }
          },
          payment: true
        }
      }
    }
  });

  if (!ticket) {
    throw new AppError('Không tìm thấy vé.', 404);
  }

  return ticket;
}

export async function createTicketAdmin(input: {
  bookingId: string;
  ticketNumber?: string;
  qrDataUrl: string;
  eTicketUrl?: string;
  invoiceNumber?: string;
}) {
  const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
  if (!booking) {
    throw new AppError('Booking không tồn tại.', 404);
  }

  return prisma.ticket.create({
    data: {
      bookingId: booking.id,
      ticketNumber: input.ticketNumber?.trim().toUpperCase() || `TK-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`,
      qrToken: randomUUID(),
      qrDataUrl: input.qrDataUrl,
      eTicketUrl: input.eTicketUrl,
      invoiceNumber: input.invoiceNumber
    }
  });
}

export async function updateTicketAdmin(
  ticketId: string,
  input: {
    eTicketUrl?: string | null;
    invoiceNumber?: string | null;
    qrDataUrl?: string;
  }
) {
  const data: Record<string, unknown> = {};
  if (input.eTicketUrl !== undefined) data.eTicketUrl = input.eTicketUrl;
  if (input.invoiceNumber !== undefined) data.invoiceNumber = input.invoiceNumber;
  if (input.qrDataUrl !== undefined) data.qrDataUrl = input.qrDataUrl;

  return prisma.ticket.update({
    where: { id: ticketId },
    data
  });
}

export async function deleteTicketAdmin(ticketId: string) {
  await prisma.ticket.delete({ where: { id: ticketId } });
  return { success: true };
}

export async function listUsersAdmin(input: PaginationInput) {
  const { page, pageSize, skip } = normalizePagination(input);
  const [total, items] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      include: {
        _count: {
          select: {
            bookings: true,
            notifications: true
          }
        }
      },
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take: pageSize
    })
  ]);

  return toPageResult(items, total, page, pageSize);
}

export async function getUserByIdAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      bookings: {
        include: {
          trip: {
            include: {
              train: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 20
      }
    }
  });

  if (!user) {
    throw new AppError('Không tìm thấy user.', 404);
  }

  return user;
}

export async function createUserAdmin(input: {
  name: string;
  email: string;
  password?: string;
  role?: 'USER' | 'ADMIN';
}) {
  return prisma.user.create({
    data: {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      passwordHash: await hashPassword(input.password ?? '123456'),
      role: input.role ?? 'USER'
    }
  });
}

export async function updateUserAdmin(
  userId: string,
  input: {
    name?: string;
    email?: string;
    password?: string;
    role?: 'USER' | 'ADMIN';
  }
) {
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.email !== undefined) data.email = input.email.trim().toLowerCase();
  if (input.password !== undefined) data.passwordHash = await hashPassword(input.password);
  if (input.role !== undefined) data.role = input.role;

  return prisma.user.update({
    where: { id: userId },
    data
  });
}

export async function deleteUserAdmin(userId: string) {
  await prisma.user.delete({ where: { id: userId } });
  return { success: true };
}
