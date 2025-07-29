import { prisma } from "@/config/prisma-client.js";

async function seed() {
  const user = await prisma.user.create({
    data: {
      firstName: "John",
      lastName: "Doe",
      email: "user@example.com",
      username: "john_doe",
      password: "hashedpassword123",
      phoneNumber: "081234567890",
      role: "USER",
      isVerified: true,
    },
  });

  const storeAdmin = await prisma.user.create({
    data: {
      firstName: "Alice",
      lastName: "Smith",
      email: "admin@store.com",
      username: "alice_smith",
      password: "hashedpassword456",
      phoneNumber: "081987654321",
      role: "STORE_ADMIN",
      isVerified: true,
    },
  });

  const store = await prisma.store.create({
    data: {
      name: "BestStore",
      userId: storeAdmin.id,
    },
  });

  const storeUser = await prisma.storeUser.create({
    data: {
      userId: storeAdmin.id,
      storeId: store.id,
    },
  });

  const product = await prisma.product.create({
    data: {
      name: "Sample Product",
      description: "This is a demo product.",
      price: 99000,
      weight: 0.5,
      userId: storeAdmin.id,
    },
  });

  await prisma.storeProduct.create({
    data: {
      storeId: store.id,
      productId: product.id,
      stock: 100,
    },
  });

  const userAddress = await prisma.userAddress.create({
    data: {
      userId: user.id,
      recipient: "John Doe",
      isPrimary: true,
    },
  });

  const address = await prisma.address.create({
    data: {
      address: "Jl. Raya No.123",
      destination: "Kota Jakarta",
      destinationId: 101,
      city: "Jakarta",
      province: "DKI Jakarta",
      postalCode: "12345",
      isPrimary: true,
      UserAddresses: {
        connect: { id: userAddress.id },
      },
    },
  });

  await prisma.storeAddress.create({
    data: {
      storeId: store.id,
      latitude: -6.2,
      longitude: 106.8,
      Address: {
        create: [
          {
            address: "Jl. Toko No. 1",
            destination: "Tangerang",
            city: "Tangerang",
            province: "Banten",
            postalCode: "15111",
            isPrimary: true,
          },
        ],
      },
    },
  });

  await prisma.discount.create({
    data: {
      storeId: store.id,
      productId: product.id,
      value: 10,
      discountType: "PERCENTAGE",
      minPurchase: 50000,
      maxDiscount: 20000,
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    },
  });
}

seed()
  .then(async () => {
    await prisma.$disconnect();
    console.log("✅ Seed complete");
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
