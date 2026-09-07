// src/routes/customer/orders.js — remove checkApiKey & authMiddleware from here
const admin = require('firebase-admin');

module.exports = async (req, res) => {
  const { page = 1, limit = 15, search = '' } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 50);

  if (pageNum < 1 || limitNum < 1) {
    return res.status(400).json({ error: 'Invalid page or limit' });
  }

  try {
    const uid = req.user.uid; // ← safe, from global middleware

    let q = admin.firestore()
      .collection('laundryOrders')
      .where('customerId', '==', uid)
      .orderBy('bookedAt', 'desc');

    const snapshot = await q.limit(limitNum * pageNum).get();

    let orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (search.trim()) {
      const term = search.toLowerCase().trim();
      orders = orders.filter(order => 
        (order.laundryId || '').toLowerCase().includes(term) ||
        (order.branchName || '').toLowerCase().includes(term) ||
        (order.mainServiceName || '').toLowerCase().includes(term) ||
        (order.specialInstructions || '').toLowerCase().includes(term)
      );
    }

    const start = (pageNum - 1) * limitNum;
    const paginated = orders.slice(start, start + limitNum);

    const totalSnap = await admin.firestore()
      .collection('laundryOrders')
      .where('customerId', '==', uid)
      .count()
      .get();

    res.status(200).json({
      success: true,
      orders: paginated,
      total: totalSnap.data().count,
      page: pageNum,
      limit: limitNum,
      hasMore: paginated.length === limitNum,
    });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};