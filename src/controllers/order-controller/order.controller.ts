import { Request, Response } from "express";
import cloudinary from "../../config/cloudinary-config.js";
import { prisma } from "../../config/prisma-client.js";
import { MidtransClient } from "midtrans-node-client";
import fetch from "node-fetch";

// Midtrans Snap setup
const snap = new MidtransClient.Snap({
  isProduction: process.env.NODE_ENV === "production",
  serverKey: process.env.MIDTRANS_SANDBOX_SERVER_KEY!,
});

// Types
interface ParsedCartItem {
  quantity: number;
  Product: {
    id: string;
    name: string;
    price: string;
    weight: number;
  };
}

interface ShippingOption {
  shippingName: string;
  serviceName: string;
}

interface AddressData {
  Address: {
    id: string;
    destinationId: string;
  }[];
}

interface RajaOngkirResult {
  data: {
    calculate_reguler: {
      shipping_name: string;
      service_name: string;
      grandtotal: number;
    }[];
  };
}

export const createManualCheckoutOrder = async (
  req: Request,
  res: Response
) => {
  try {
    const user = req.user as { id: string; firstName: string; email: string };
    const baseUrl = process.env.NEXT_PUBLIC_DOMAIN!;
    const file = req.file;

    let { address, shippingOptions, cartItems, paymentMethod } = req.body;

    if (!file && paymentMethod === "manual") {
      res.status(400).json({ message: "No payment proof uploaded." });
      return;
    }

    // Upload proof to Cloudinary
    let uploadRes = null;
    if (paymentMethod === "manual" && file) {
      const base64Image = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
      uploadRes = await cloudinary.uploader.upload(base64Image, {
        folder: "payment_proofs",
      });
    }

    // Parse input
    const parsedAddress: AddressData =
      typeof address === "string" ? JSON.parse(address) : address;
    const parsedCart: ParsedCartItem[] =
      typeof cartItems === "string" ? JSON.parse(cartItems) : cartItems;
    const parsedShipping: ShippingOption =
      typeof shippingOptions === "string"
        ? JSON.parse(shippingOptions)
        : shippingOptions;

    // Hit API rajaongkir untuk kalkulasi ongkir
    const totalWeight = parsedCart.reduce(
      (sum, item) => sum + item.Product.weight * item.quantity,
      0
    );

    const subtotal = parsedCart.reduce(
      (sum, item) => sum + parseFloat(item.Product.price) * item.quantity,
      0
    );

    const queryParams = new URLSearchParams({
      shipper_destination_id: "501",
      receiver_destination_id: parsedAddress.Address[0].destinationId,
      weight: totalWeight.toString(),
      item_value: subtotal.toString(),
      cod: "false",
    });

    const response = await fetch(
      `${baseUrl}/api/v1/rajaongkir/calculate?${queryParams}`
    );
    const result: unknown = await response.json();

    // Validate result
    if (
      typeof result !== "object" ||
      result === null ||
      !("data" in result) ||
      !("calculate_reguler" in (result as any).data)
    ) {
      res.status(400).json({ message: "Failed to calculate shipping cost." });
      return;
    }

    const shippingList = (result as RajaOngkirResult).data.calculate_reguler;
    const shippingMatch = shippingList.find(
      (s) =>
        s.shipping_name === parsedShipping.shippingName &&
        s.service_name === parsedShipping.serviceName
    );

    if (!shippingMatch) {
      res.status(400).json({ message: "Shipping option not found." });
      return;
    }

    const shippingCost = shippingMatch.grandtotal;
    const totalPrice = subtotal + shippingCost;
    const orderNumber = `ORD-${Date.now()}`;

    // Simpan Order ke DB
    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        subTotal: subtotal,
        shippingTotal: shippingCost,
        totalPrice,
        shippingOptions: parsedShipping as object, // ✅ Cast JSON aman
        proofImageUrl: uploadRes?.secure_url || null,
        addressId: parsedAddress.Address[0].id,
        userId: user.id,
        paymentMethod,
        OrderItem: {
          create: parsedCart.map((item) => ({
            productId: item.Product.id,
            unitPrice: parseFloat(item.Product.price),
            quantity: item.quantity,
            total: parseFloat(item.Product.price) * item.quantity,
          })),
        },
      },
      include: {
        OrderItem: true,
      },
    });

    // Jika bukan manual, inisiasi Midtrans
    if (paymentMethod !== "manual") {
      const itemDetails = parsedCart.map((item) => ({
        id: item.Product.id,
        name: item.Product.name,
        quantity: item.quantity,
        price: parseFloat(item.Product.price),
      }));

      itemDetails.push({
        id: "SHIPPING",
        name: "Shipping Cost",
        quantity: 1,
        price: shippingCost,
      });

      const midtransTransaction = await snap.createTransaction({
        transaction_details: {
          order_id: orderNumber,
          gross_amount: totalPrice,
        },
        item_details: itemDetails,
        customer_details: {
          first_name: user.firstName,
          email: user.email,
        },
      });

      res.status(201).json({
        message: "Order created and Midtrans transaction initialized",
        data: {
          midtransTransaction,
          orderNumber,
        },
      });
      return;
    }

    // Manual payment done
    res.status(200).json({
      message: "Manual payment submitted",
      data: newOrder,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({ message: "Internal server error during checkout." });
  }
};
