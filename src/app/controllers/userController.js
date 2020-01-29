import User from '../models/user';

class UserController {
  async store(req, res, next) {
    const userExist = await User.findOne({ where: { email: req.body.email } });
    if (userExist) {
      return res.status(400).json({ message: 'email in use' });
    }
    try {
      const { id, name, email, provider } = await User.create(req.body);
      return res.json({
        id,
        name,
        email,
        provider,
      });
    } catch (e) {
      return res.send(e);
    }
  }

  async update(req, res) {
    return res.json(req.userId);
  }
}

export default new UserController();
