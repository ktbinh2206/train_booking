"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listStationsAdmin = listStationsAdmin;
exports.getStationByIdAdmin = getStationByIdAdmin;
exports.createStationAdmin = createStationAdmin;
exports.updateStationAdmin = updateStationAdmin;
exports.deleteStationAdmin = deleteStationAdmin;
exports.listTrainsAdmin = listTrainsAdmin;
exports.getTrainByIdAdmin = getTrainByIdAdmin;
exports.createTrainAdmin = createTrainAdmin;
exports.updateTrainAdmin = updateTrainAdmin;
exports.deleteTrainAdmin = deleteTrainAdmin;
exports.listCarriagesAdmin = listCarriagesAdmin;
exports.getCarriageByIdAdmin = getCarriageByIdAdmin;
exports.createCarriageAdmin = createCarriageAdmin;
exports.updateCarriageAdmin = updateCarriageAdmin;
exports.deleteCarriageAdmin = deleteCarriageAdmin;
exports.listSeatsAdmin = listSeatsAdmin;
exports.getSeatByIdAdmin = getSeatByIdAdmin;
exports.createSeatAdmin = createSeatAdmin;
exports.updateSeatAdmin = updateSeatAdmin;
exports.deleteSeatAdmin = deleteSeatAdmin;
exports.listTripsAdmin = listTripsAdmin;
exports.getTripByIdAdmin = getTripByIdAdmin;
exports.createTripAdmin = createTripAdmin;
exports.updateTripAdmin = updateTripAdmin;
exports.deleteTripAdmin = deleteTripAdmin;
exports.listBookingsAdmin = listBookingsAdmin;
exports.getBookingByIdAdmin = getBookingByIdAdmin;
exports.createBookingAdmin = createBookingAdmin;
exports.updateBookingAdmin = updateBookingAdmin;
exports.deleteBookingAdmin = deleteBookingAdmin;
exports.listTicketsAdmin = listTicketsAdmin;
exports.getTicketByIdAdmin = getTicketByIdAdmin;
exports.createTicketAdmin = createTicketAdmin;
exports.updateTicketAdmin = updateTicketAdmin;
exports.deleteTicketAdmin = deleteTicketAdmin;
exports.listUsersAdmin = listUsersAdmin;
exports.getUserByIdAdmin = getUserByIdAdmin;
exports.createUserAdmin = createUserAdmin;
exports.updateUserAdmin = updateUserAdmin;
exports.deleteUserAdmin = deleteUserAdmin;
const decimal_js_1 = __importDefault(require("decimal.js"));
const crypto_1 = require("crypto");
const prisma_1 = require("../lib/prisma");
const errors_1 = require("../lib/errors");
const password_1 = require("../lib/password");
const bookingService_1 = require("./bookingService");
function seatIdFromTrainCode(trainCode, carriageCode, seatCode) {
    return `${trainCode.trim().toUpperCase()}_${carriageCode.trim().toUpperCase()}_${seatCode.trim().toUpperCase()}`;
}
function normalizePagination(input) {
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
function toPageResult(items, total, page, pageSize) {
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
async function listStationsAdmin(input) {
    const { page, pageSize, skip } = normalizePagination(input);
    const [total, items] = await Promise.all([
        prisma_1.prisma.station.count(),
        prisma_1.prisma.station.findMany({
            orderBy: [{ code: 'asc' }],
            skip,
            take: pageSize
        })
    ]);
    return toPageResult(items, total, page, pageSize);
}
async function getStationByIdAdmin(stationId) {
    const station = await prisma_1.prisma.station.findUnique({ where: { id: stationId } });
    if (!station) {
        throw new errors_1.AppError('Không tìm thấy ga.', 404);
    }
    return station;
}
async function createStationAdmin(input) {
    return prisma_1.prisma.station.create({
        data: {
            code: input.code.trim().toUpperCase(),
            name: input.name.trim(),
            city: input.city.trim()
        }
    });
}
async function updateStationAdmin(stationId, input) {
    const data = {};
    if (input.code !== undefined)
        data.code = input.code.trim().toUpperCase();
    if (input.name !== undefined)
        data.name = input.name.trim();
    if (input.city !== undefined)
        data.city = input.city.trim();
    return prisma_1.prisma.station.update({
        where: { id: stationId },
        data
    });
}
async function deleteStationAdmin(stationId) {
    await prisma_1.prisma.station.delete({ where: { id: stationId } });
    return { success: true };
}
async function listTrainsAdmin(input) {
    const { page, pageSize, skip } = normalizePagination(input);
    const [total, items] = await Promise.all([
        prisma_1.prisma.train.count(),
        prisma_1.prisma.train.findMany({
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
async function getTrainByIdAdmin(trainId) {
    const train = await prisma_1.prisma.train.findUnique({
        where: { id: trainId },
        include: {
            carriages: {
                include: {
                    seats: {
                        orderBy: {
                            code: 'asc'
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
        throw new errors_1.AppError('Không tìm thấy tàu.', 404);
    }
    return {
        ...train,
        carriages: train.carriages.map((carriage) => ({
            ...carriage,
            seatCount: carriage.seats.length
        }))
    };
}
async function createTrainAdmin(input) {
    return prisma_1.prisma.train.create({
        data: {
            code: input.code.trim().toUpperCase(),
            name: input.name.trim()
        }
    });
}
async function updateTrainAdmin(trainId, input) {
    const data = {};
    if (input.code !== undefined)
        data.code = input.code.trim().toUpperCase();
    if (input.name !== undefined)
        data.name = input.name.trim();
    return prisma_1.prisma.train.update({
        where: { id: trainId },
        data
    });
}
async function deleteTrainAdmin(trainId) {
    await prisma_1.prisma.train.delete({ where: { id: trainId } });
    return { success: true };
}
async function listCarriagesAdmin(input) {
    const { page, pageSize, skip } = normalizePagination(input);
    const where = input.trainId ? { trainId: input.trainId } : undefined;
    const [total, items] = await Promise.all([
        prisma_1.prisma.carriage.count({ where }),
        prisma_1.prisma.carriage.findMany({
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
async function getCarriageByIdAdmin(carriageId) {
    const carriage = await prisma_1.prisma.carriage.findUnique({
        where: { id: carriageId },
        include: {
            train: true,
            seats: {
                orderBy: {
                    code: 'asc'
                }
            }
        }
    });
    if (!carriage) {
        throw new errors_1.AppError('Không tìm thấy toa.', 404);
    }
    return carriage;
}
async function createCarriageAdmin(input) {
    const train = await prisma_1.prisma.train.findUnique({ where: { id: input.trainId } });
    if (!train) {
        throw new errors_1.AppError('Tàu không tồn tại.', 404);
    }
    return prisma_1.prisma.carriage.create({
        data: {
            trainId: input.trainId,
            code: input.code.trim().toUpperCase(),
            orderIndex: input.orderIndex,
            type: input.type,
            basePrice: input.basePrice === undefined ? undefined : new decimal_js_1.default(input.basePrice),
            layout: input.layout
        }
    });
}
async function updateCarriageAdmin(carriageId, input) {
    const data = {};
    if (input.code !== undefined)
        data.code = input.code.trim().toUpperCase();
    if (input.orderIndex !== undefined)
        data.orderIndex = input.orderIndex;
    if (input.type !== undefined)
        data.type = input.type;
    if (input.basePrice !== undefined)
        data.basePrice = new decimal_js_1.default(input.basePrice);
    if (input.layout !== undefined)
        data.layout = input.layout;
    return prisma_1.prisma.carriage.update({
        where: { id: carriageId },
        data
    });
}
async function deleteCarriageAdmin(carriageId) {
    await prisma_1.prisma.carriage.delete({ where: { id: carriageId } });
    return { success: true };
}
async function listSeatsAdmin(input) {
    const { page, pageSize, skip } = normalizePagination(input);
    const where = input.carriageId ? { carriageId: input.carriageId } : undefined;
    const [total, items] = await Promise.all([
        prisma_1.prisma.seat.count({ where }),
        prisma_1.prisma.seat.findMany({
            where,
            include: {
                carriage: {
                    include: {
                        train: true
                    }
                }
            },
            orderBy: [{ carriage: { orderIndex: 'asc' } }, { code: 'asc' }],
            skip,
            take: pageSize
        })
    ]);
    return toPageResult(items, total, page, pageSize);
}
async function getSeatByIdAdmin(seatId) {
    const seat = await prisma_1.prisma.seat.findUnique({
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
        throw new errors_1.AppError('Không tìm thấy ghế.', 404);
    }
    return seat;
}
async function createSeatAdmin(input) {
    const carriage = await prisma_1.prisma.carriage.findUnique({ where: { id: input.carriageId }, include: { train: true } });
    if (!carriage) {
        throw new errors_1.AppError('Toa không tồn tại.', 404);
    }
    const code = input.code.trim().toUpperCase();
    return prisma_1.prisma.seat.create({
        data: {
            id: seatIdFromTrainCode(carriage.train.code, carriage.code, code),
            carriageId: input.carriageId,
            code,
            status: input.status ?? 'ACTIVE',
            price: input.price === undefined || input.price === null ? null : new decimal_js_1.default(input.price)
        }
    });
}
async function updateSeatAdmin(seatId, input) {
    const current = await prisma_1.prisma.seat.findUnique({
        where: { id: seatId },
        include: {
            carriage: {
                include: {
                    train: true
                }
            }
        }
    });
    if (!current) {
        throw new errors_1.AppError('Không tìm thấy ghế.', 404);
    }
    const data = {};
    if (input.code !== undefined) {
        const code = input.code.trim().toUpperCase();
        data.code = code;
        data.id = seatIdFromTrainCode(current.carriage.train.code, current.carriage.code, code);
    }
    if (input.status !== undefined)
        data.status = input.status;
    if (input.price !== undefined)
        data.price = input.price === null ? null : new decimal_js_1.default(input.price);
    return prisma_1.prisma.seat.update({
        where: { id: seatId },
        data
    });
}
async function deleteSeatAdmin(seatId) {
    await prisma_1.prisma.seat.delete({ where: { id: seatId } });
    return { success: true };
}
async function listTripsAdmin(input) {
    const { page, pageSize, skip } = normalizePagination(input);
    const [total, items] = await Promise.all([
        prisma_1.prisma.trip.count(),
        prisma_1.prisma.trip.findMany({
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
async function getTripByIdAdmin(tripId) {
    const trip = await prisma_1.prisma.trip.findUnique({
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
        throw new errors_1.AppError('Không tìm thấy chuyến.', 404);
    }
    return trip;
}
async function createTripAdmin(input) {
    const [train, originStation, destinationStation] = await Promise.all([
        prisma_1.prisma.train.findUnique({ where: { id: input.trainId } }),
        prisma_1.prisma.station.findUnique({ where: { id: input.originStationId } }),
        prisma_1.prisma.station.findUnique({ where: { id: input.destinationStationId } })
    ]);
    if (!train)
        throw new errors_1.AppError('Tàu không tồn tại.', 404);
    if (!originStation)
        throw new errors_1.AppError('Ga đi không tồn tại.', 404);
    if (!destinationStation)
        throw new errors_1.AppError('Ga đến không tồn tại.', 404);
    if (originStation.id === destinationStation.id)
        throw new errors_1.AppError('Ga đi và ga đến phải khác nhau.', 400);
    return prisma_1.prisma.trip.create({
        data: {
            trainId: train.id,
            originStationId: originStation.id,
            destinationStationId: destinationStation.id,
            origin: originStation.name,
            destination: destinationStation.name,
            departureTime: new Date(input.departureTime),
            arrivalTime: new Date(input.arrivalTime),
            price: new decimal_js_1.default(input.price),
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
async function updateTripAdmin(tripId, input) {
    const data = {};
    if (input.trainId !== undefined) {
        const train = await prisma_1.prisma.train.findUnique({ where: { id: input.trainId } });
        if (!train)
            throw new errors_1.AppError('Tàu không tồn tại.', 404);
        data.trainId = train.id;
    }
    let originStationName;
    let destinationStationName;
    if (input.originStationId !== undefined) {
        const originStation = await prisma_1.prisma.station.findUnique({ where: { id: input.originStationId } });
        if (!originStation)
            throw new errors_1.AppError('Ga đi không tồn tại.', 404);
        data.originStationId = originStation.id;
        originStationName = originStation.name;
    }
    if (input.destinationStationId !== undefined) {
        const destinationStation = await prisma_1.prisma.station.findUnique({ where: { id: input.destinationStationId } });
        if (!destinationStation)
            throw new errors_1.AppError('Ga đến không tồn tại.', 404);
        data.destinationStationId = destinationStation.id;
        destinationStationName = destinationStation.name;
    }
    if (originStationName !== undefined)
        data.origin = originStationName;
    if (destinationStationName !== undefined)
        data.destination = destinationStationName;
    if (input.departureTime !== undefined)
        data.departureTime = new Date(input.departureTime);
    if (input.arrivalTime !== undefined)
        data.arrivalTime = new Date(input.arrivalTime);
    if (input.price !== undefined)
        data.price = new decimal_js_1.default(input.price);
    if (input.status !== undefined)
        data.status = input.status;
    if (input.delayMinutes !== undefined)
        data.delayMinutes = input.delayMinutes;
    if (input.note !== undefined)
        data.note = input.note;
    return prisma_1.prisma.trip.update({
        where: { id: tripId },
        data,
        include: {
            train: true,
            originStation: true,
            destinationStation: true
        }
    });
}
async function deleteTripAdmin(tripId) {
    const bookingCount = await prisma_1.prisma.booking.count({
        where: {
            tripId
        }
    });
    if (bookingCount > 0) {
        throw new errors_1.AppError('Cannot delete trip with existing bookings', 409);
    }
    await prisma_1.prisma.trip.delete({ where: { id: tripId } });
    return { success: true };
}
async function listBookingsAdmin(input) {
    const { page, pageSize, skip } = normalizePagination(input);
    const [total, items] = await Promise.all([
        prisma_1.prisma.booking.count(),
        prisma_1.prisma.booking.findMany({
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
async function getBookingByIdAdmin(bookingId) {
    const booking = await prisma_1.prisma.booking.findUnique({
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
        throw new errors_1.AppError('Không tìm thấy booking.', 404);
    }
    return booking;
}
async function createBookingAdmin(input) {
    const booking = await (0, bookingService_1.createBooking)({
        userId: input.userId,
        tripId: input.tripId,
        seatIds: input.seatIds,
        contactEmail: input.contactEmail
    });
    if (input.markAsPaid) {
        return (0, bookingService_1.payBooking)(booking.id);
    }
    return booking;
}
async function updateBookingAdmin(bookingId, input) {
    const data = {};
    if (input.status !== undefined)
        data.status = input.status;
    if (input.contactEmail !== undefined)
        data.contactEmail = input.contactEmail.trim().toLowerCase();
    return prisma_1.prisma.booking.update({
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
async function deleteBookingAdmin(bookingId) {
    await prisma_1.prisma.booking.delete({ where: { id: bookingId } });
    return { success: true };
}
async function listTicketsAdmin(input) {
    const { page, pageSize, skip } = normalizePagination(input);
    const [total, items] = await Promise.all([
        prisma_1.prisma.ticket.count(),
        prisma_1.prisma.ticket.findMany({
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
async function getTicketByIdAdmin(ticketId) {
    const ticket = await prisma_1.prisma.ticket.findUnique({
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
        throw new errors_1.AppError('Không tìm thấy vé.', 404);
    }
    return ticket;
}
async function createTicketAdmin(input) {
    const booking = await prisma_1.prisma.booking.findUnique({ where: { id: input.bookingId } });
    if (!booking) {
        throw new errors_1.AppError('Booking không tồn tại.', 404);
    }
    return prisma_1.prisma.ticket.create({
        data: {
            bookingId: booking.id,
            ticketNumber: input.ticketNumber?.trim().toUpperCase() || `TK-${Date.now().toString(36).toUpperCase()}-${(0, crypto_1.randomUUID)().slice(0, 6).toUpperCase()}`,
            qrToken: (0, crypto_1.randomUUID)(),
            qrDataUrl: input.qrDataUrl,
            eTicketUrl: input.eTicketUrl,
            invoiceNumber: input.invoiceNumber
        }
    });
}
async function updateTicketAdmin(ticketId, input) {
    const data = {};
    if (input.eTicketUrl !== undefined)
        data.eTicketUrl = input.eTicketUrl;
    if (input.invoiceNumber !== undefined)
        data.invoiceNumber = input.invoiceNumber;
    if (input.qrDataUrl !== undefined)
        data.qrDataUrl = input.qrDataUrl;
    return prisma_1.prisma.ticket.update({
        where: { id: ticketId },
        data
    });
}
async function deleteTicketAdmin(ticketId) {
    await prisma_1.prisma.ticket.delete({ where: { id: ticketId } });
    return { success: true };
}
async function listUsersAdmin(input) {
    const { page, pageSize, skip } = normalizePagination(input);
    const [total, items] = await Promise.all([
        prisma_1.prisma.user.count(),
        prisma_1.prisma.user.findMany({
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
async function getUserByIdAdmin(userId) {
    const user = await prisma_1.prisma.user.findUnique({
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
        throw new errors_1.AppError('Không tìm thấy user.', 404);
    }
    return user;
}
async function createUserAdmin(input) {
    return prisma_1.prisma.user.create({
        data: {
            name: input.name.trim(),
            email: input.email.trim().toLowerCase(),
            passwordHash: await (0, password_1.hashPassword)(input.password ?? '123456'),
            role: input.role ?? 'USER'
        }
    });
}
async function updateUserAdmin(userId, input) {
    const data = {};
    if (input.name !== undefined)
        data.name = input.name.trim();
    if (input.email !== undefined)
        data.email = input.email.trim().toLowerCase();
    if (input.password !== undefined)
        data.passwordHash = await (0, password_1.hashPassword)(input.password);
    if (input.role !== undefined)
        data.role = input.role;
    return prisma_1.prisma.user.update({
        where: { id: userId },
        data
    });
}
async function deleteUserAdmin(userId) {
    await prisma_1.prisma.user.delete({ where: { id: userId } });
    return { success: true };
}
