// src/routes/customer/profile.js — remove duplicated middleware
const admin = require('firebase-admin');

module.exports = async (req, res) => {
  const uid = req.user.uid;
  const { name, phone, gender } = req.body;

  if (!name && !phone && !gender) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  try {
    const updates = {};
    if (name) updates.name = name.trim();
    if (phone) updates.phone = phone.trim();
    if (gender !== undefined) updates.gender = gender;

    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await admin.firestore().collection('users').doc(uid).update(updates);

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};