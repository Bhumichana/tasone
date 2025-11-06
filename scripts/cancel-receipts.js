const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function cancelReceipts() {
  const receiptNumbers = [
    'RCP-cmgak9ua30000g7qceikae9jd-20251027-003',
    'RCP-cmgak9ua30000g7qceikae9jd-20251027-004',
    'RCP-cmgak9ua30000g7qceikae9jd-20251027-005',
    'RCP-cmgak9ua30000g7qceikae9jd-20251027-006'
  ]

  console.log('Starting to cancel receipts...\n')

  for (const receiptNumber of receiptNumbers) {
    try {
      // Find the receipt
      const receipt = await prisma.dealerReceipt.findUnique({
        where: { receiptNumber },
        include: {
          items: true,
          materialDelivery: true
        }
      })

      if (!receipt) {
        console.log(`❌ Receipt ${receiptNumber} not found`)
        continue
      }

      console.log(`Processing ${receiptNumber}...`)

      await prisma.$transaction(async (tx) => {
        // 1. Reduce DealerStock
        for (const item of receipt.items) {
          const stock = await tx.dealerStock.findFirst({
            where: {
              dealerId: receipt.dealerId,
              materialCode: item.rawMaterialId,
              batchNumber: item.batchNumber
            }
          })

          if (stock) {
            const newStock = stock.currentStock - item.receivedQuantity

            if (newStock <= 0) {
              // Delete if stock becomes zero or negative
              await tx.dealerStock.delete({
                where: { id: stock.id }
              })
              console.log(`  ✓ Deleted DealerStock for ${item.batchNumber}`)
            } else {
              // Update stock
              await tx.dealerStock.update({
                where: { id: stock.id },
                data: { currentStock: newStock }
              })
              console.log(`  ✓ Updated DealerStock for ${item.batchNumber}`)
            }
          }
        }

        // 2. Delete DealerReceiptItems (will cascade)
        await tx.dealerReceiptItem.deleteMany({
          where: { receiptId: receipt.id }
        })
        console.log(`  ✓ Deleted receipt items`)

        // 3. Delete DealerReceipt
        await tx.dealerReceipt.delete({
          where: { id: receipt.id }
        })
        console.log(`  ✓ Deleted receipt`)

        // 4. Change MaterialDelivery status back to PENDING_RECEIPT
        await tx.materialDelivery.update({
          where: { id: receipt.materialDeliveryId },
          data: { status: 'PENDING_RECEIPT' }
        })
        console.log(`  ✓ Changed delivery status to PENDING_RECEIPT`)
      })

      console.log(`✅ Successfully cancelled ${receiptNumber}\n`)

    } catch (error) {
      console.error(`❌ Error cancelling ${receiptNumber}:`, error.message)
    }
  }

  console.log('Done!')
  await prisma.$disconnect()
}

cancelReceipts()
