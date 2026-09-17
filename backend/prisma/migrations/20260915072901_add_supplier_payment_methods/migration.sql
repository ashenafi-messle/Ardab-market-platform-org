-- CreateTable
CREATE TABLE "supplier_payment_methods" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplier_payment_methods_supplierId_idx" ON "supplier_payment_methods"("supplierId");

-- CreateIndex
CREATE INDEX "supplier_payment_methods_paymentMethod_idx" ON "supplier_payment_methods"("paymentMethod");

-- AddForeignKey
ALTER TABLE "supplier_payment_methods" ADD CONSTRAINT "supplier_payment_methods_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
