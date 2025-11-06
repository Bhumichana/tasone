-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "userGroup" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT,
    "lineId" TEXT,
    "profileImage" TEXT,
    "dealerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dealers" (
    "id" TEXT NOT NULL,
    "dealerCode" TEXT NOT NULL,
    "manufacturerNumber" TEXT NOT NULL,
    "dealerName" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ตัวแทนจำหน่าย',
    "region" TEXT,
    "address" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dealers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_dealers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phoneNumber" TEXT,
    "email" TEXT,
    "dealerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_dealers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_materials" (
    "id" TEXT NOT NULL,
    "materialCode" TEXT NOT NULL,
    "materialName" TEXT NOT NULL,
    "materialType" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "supplier" TEXT,
    "location" TEXT,
    "expiryDate" TIMESTAMP(3),
    "batchNumber" TEXT,
    "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raw_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "serialNumber" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "warrantyTerms" TEXT,
    "thickness" DOUBLE PRECISION,
    "templateImage" TEXT DEFAULT 'Certification-Form.jpg',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranties" (
    "id" TEXT NOT NULL,
    "warrantyNumber" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerAddress" TEXT NOT NULL,
    "warrantyDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "warrantyPeriodMonths" INTEGER NOT NULL,
    "warrantyTerms" TEXT,
    "dealerName" TEXT,
    "productionDate" TIMESTAMP(3),
    "deliveryDate" TIMESTAMP(3),
    "purchaseOrderNo" TEXT,
    "installationArea" DOUBLE PRECISION,
    "thickness" DOUBLE PRECISION,
    "chemicalBatchNo" TEXT,
    "materialUsage" TEXT,
    "dealerId" TEXT NOT NULL,
    "subDealerId" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "editedBy" TEXT,
    "editStatus" TEXT DEFAULT 'active',
    "editRequestedAt" TIMESTAMP(3),
    "editApproved" BOOLEAN,
    "editApprovedAt" TIMESTAMP(3),
    "editApprovedBy" TEXT,
    "approvalNote" TEXT,
    "editReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warranties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_material_receiving" (
    "id" TEXT NOT NULL,
    "receivingNumber" TEXT NOT NULL,
    "receivingDate" TIMESTAMP(3) NOT NULL,
    "purchaseOrderNo" TEXT,
    "supplier" TEXT NOT NULL,
    "rawMaterialId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "receivedQuantity" DOUBLE PRECISION NOT NULL,
    "storageLocation" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "qualityStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "receivedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raw_material_receiving_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_material_batches" (
    "id" TEXT NOT NULL,
    "rawMaterialId" TEXT NOT NULL,
    "receivingId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "initialQuantity" DOUBLE PRECISION NOT NULL,
    "currentStock" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "storageLocation" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "isRecertified" BOOLEAN NOT NULL DEFAULT false,
    "recertificationCount" INTEGER NOT NULL DEFAULT 0,
    "lastRecertifiedAt" TIMESTAMP(3),
    "lastRecertifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raw_material_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_deliveries" (
    "id" TEXT NOT NULL,
    "deliveryNumber" TEXT NOT NULL,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "dealerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_RECEIPT',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_delivery_items" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "rawMaterialId" TEXT NOT NULL,
    "batchId" TEXT,
    "batchNumber" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_delivery_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dealer_receipts" (
    "id" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "materialDeliveryId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "receiptDate" TIMESTAMP(3) NOT NULL,
    "receivedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dealer_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dealer_receipt_items" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "rawMaterialId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "receivedQuantity" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dealer_receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dealer_stock" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "materialCode" TEXT NOT NULL,
    "materialName" TEXT NOT NULL,
    "materialType" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "isRecertified" BOOLEAN NOT NULL DEFAULT false,
    "recertificationCount" INTEGER NOT NULL DEFAULT 0,
    "lastRecertifiedAt" TIMESTAMP(3),
    "lastRecertifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dealer_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dealer_notifications" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dealer_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "headoffice_notifications" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "notificationType" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" TEXT,
    "warrantyId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolvedNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "headoffice_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_recipes" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "recipeName" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "calculationUnit" TEXT NOT NULL DEFAULT 'PER_UNIT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_recipe_items" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "rawMaterialId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_recipe_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranty_history" (
    "id" TEXT NOT NULL,
    "warrantyId" TEXT NOT NULL,
    "editedBy" TEXT NOT NULL,
    "editedByName" TEXT NOT NULL,
    "editedByGroup" TEXT NOT NULL,
    "changesSummary" TEXT NOT NULL,
    "oldData" TEXT NOT NULL,
    "newData" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warranty_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recertification_history" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "oldExpiryDate" TIMESTAMP(3) NOT NULL,
    "newExpiryDate" TIMESTAMP(3) NOT NULL,
    "extendedDays" INTEGER NOT NULL DEFAULT 60,
    "recertifiedBy" TEXT NOT NULL,
    "recertifiedByName" TEXT NOT NULL,
    "reason" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recertification_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dealer_recertification_history" (
    "id" TEXT NOT NULL,
    "dealerStockId" TEXT NOT NULL,
    "oldExpiryDate" TIMESTAMP(3) NOT NULL,
    "newExpiryDate" TIMESTAMP(3) NOT NULL,
    "extendedDays" INTEGER NOT NULL DEFAULT 60,
    "recertifiedBy" TEXT NOT NULL,
    "recertifiedByName" TEXT NOT NULL,
    "reason" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dealer_recertification_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "dealers_dealerCode_key" ON "dealers"("dealerCode");

-- CreateIndex
CREATE UNIQUE INDEX "raw_materials_materialCode_key" ON "raw_materials"("materialCode");

-- CreateIndex
CREATE UNIQUE INDEX "products_productCode_key" ON "products"("productCode");

-- CreateIndex
CREATE UNIQUE INDEX "products_serialNumber_key" ON "products"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "warranties_warrantyNumber_key" ON "warranties"("warrantyNumber");

-- CreateIndex
CREATE UNIQUE INDEX "raw_material_receiving_receivingNumber_key" ON "raw_material_receiving"("receivingNumber");

-- CreateIndex
CREATE UNIQUE INDEX "raw_material_batches_rawMaterialId_batchNumber_key" ON "raw_material_batches"("rawMaterialId", "batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "material_deliveries_deliveryNumber_key" ON "material_deliveries"("deliveryNumber");

-- CreateIndex
CREATE UNIQUE INDEX "dealer_receipts_receiptNumber_key" ON "dealer_receipts"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "dealer_receipts_materialDeliveryId_key" ON "dealer_receipts"("materialDeliveryId");

-- CreateIndex
CREATE UNIQUE INDEX "dealer_stock_dealerId_materialCode_batchNumber_key" ON "dealer_stock"("dealerId", "materialCode", "batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "product_recipes_productId_key" ON "product_recipes"("productId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "dealers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_dealers" ADD CONSTRAINT "sub_dealers_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "dealers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "dealers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_subDealerId_fkey" FOREIGN KEY ("subDealerId") REFERENCES "sub_dealers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_material_receiving" ADD CONSTRAINT "raw_material_receiving_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "raw_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_material_batches" ADD CONSTRAINT "raw_material_batches_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "raw_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_material_batches" ADD CONSTRAINT "raw_material_batches_receivingId_fkey" FOREIGN KEY ("receivingId") REFERENCES "raw_material_receiving"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_deliveries" ADD CONSTRAINT "material_deliveries_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "dealers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_delivery_items" ADD CONSTRAINT "material_delivery_items_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "material_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_delivery_items" ADD CONSTRAINT "material_delivery_items_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "raw_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_delivery_items" ADD CONSTRAINT "material_delivery_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "raw_material_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealer_receipts" ADD CONSTRAINT "dealer_receipts_materialDeliveryId_fkey" FOREIGN KEY ("materialDeliveryId") REFERENCES "material_deliveries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealer_receipts" ADD CONSTRAINT "dealer_receipts_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "dealers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealer_receipt_items" ADD CONSTRAINT "dealer_receipt_items_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "dealer_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealer_stock" ADD CONSTRAINT "dealer_stock_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "dealers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealer_notifications" ADD CONSTRAINT "dealer_notifications_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "dealers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recipes" ADD CONSTRAINT "product_recipes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recipe_items" ADD CONSTRAINT "product_recipe_items_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "product_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recipe_items" ADD CONSTRAINT "product_recipe_items_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "raw_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_history" ADD CONSTRAINT "warranty_history_warrantyId_fkey" FOREIGN KEY ("warrantyId") REFERENCES "warranties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recertification_history" ADD CONSTRAINT "recertification_history_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "raw_material_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealer_recertification_history" ADD CONSTRAINT "dealer_recertification_history_dealerStockId_fkey" FOREIGN KEY ("dealerStockId") REFERENCES "dealer_stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
