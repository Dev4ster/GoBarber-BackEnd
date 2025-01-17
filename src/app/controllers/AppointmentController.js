import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt';
import Appointment from '../models/Appointment';
import User from '../models/user';
import File from '../models/File';
import Notification from '../schemas/notification';
import Queue from '../../lib/Queue';
import CancellationMail from '../jobs/CancellationMail';

class AppointmentController {
  async index(req, res) {
    const { page = 1 } = req.query;
    const appointments = await Appointment.findAll({
      where: { user_id: req.userId, canceled_at: null },
      order: ['date'],
      attributes: ['id', 'date', 'past', 'cancelable'],
      limit: 5,
      offset: (page - 1) * 5,
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [{ model: File, as: 'avatar', attributes: ['id', 'url'] }],
        },
      ],
    });
    return res.json(appointments);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });
    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'validation fails' });
    }
    const { provider_id, date } = req.body;

    /**
     * check if provider_id is a provider
     */

    const isProvider = await User.findOne({
      where: {
        id: provider_id,
        provider: true,
      },
    });

    if (!isProvider) {
      res
        .status(401)
        .json({ error: 'you can only create appointments with providers' });
    }
    /**
     * check for post dates
     */
    const hourStart = startOfHour(parseISO(date));

    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Post dates are not permited' });
    }

    /**
     * check date availability
     */
    const checkAvailability = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      },
    });

    if (checkAvailability) {
      return res.status(400).json({ error: 'post dates not permited' });
    }

    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      date: hourStart,
    });

    /**
     * notify provider
     */

    const user = await User.findByPk(req.userId);
    const fromatedDate = format(
      hourStart,
      "'dia', dd 'de' MMMM', ás 'H:mm'h'",
      { locale: pt }
    );
    await Notification.create({
      content: `Novo agendamento de ${user.name} para ${fromatedDate}`,
      user: provider_id,
    });
    return res.json(appointment);
  }

  async delete(req, res) {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        { model: User, as: 'provider', attributes: ['name', 'email'] },
        { model: User, as: 'user', attributes: ['name', 'email'] },
      ],
    });
    if (!appointment) {
      return res.status(400).json({ error: 'appointment not found' });
    }
    if (appointment.canceled_at !== null) {
      return res
        .status(401)
        .json({ error: 'this appointment is already canceled ' });
    }

    if (appointment.user_id !== req.userId) {
      return res
        .status(401)
        .json({ error: 'user not permited to cancel this appointment ' });
    }
    const dateWithSub = subHours(appointment.date, 2);

    if (isBefore(dateWithSub, new Date())) {
      return res.status(401).json({ error: 'date  ' });
    }

    // appointment.canceled_at = new Date();

    // await appointment.save();

    await Queue.add(CancellationMail.key, {
      appointment,
    });

    return res.json(appointment);
  }
}
export default new AppointmentController();
