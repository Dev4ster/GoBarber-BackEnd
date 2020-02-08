import Notification from '../schemas/notification';
import User from '../models/user';

class NotificationController {
  async index(req, res) {
    const isProvider = await User.findOne({
      where: {
        id: req.userId,
        provider: true,
      },
    });

    if (!isProvider) {
      res.status(401).json({ error: 'only view notifications with provider' });
    }

    const notifications = await Notification.find({
      user: req.userId,
    })
      .sort({ createdAt: 'desc' })
      .limit(20);
    return res.json(notifications);
  }

  async update(req, res) {
    const { id } = req.params;
    // const notification = await Notification.findById(id);

    const notification = await Notification.findByIdAndUpdate(
      id,
      {
        read: true,
      },
      { new: true }
    );
    return res.json(notification);
  }
}
export default new NotificationController();
