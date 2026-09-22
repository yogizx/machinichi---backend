import { Response, NextFunction } from 'express';
import { Task } from '../../models/Task';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendError } from '../../services/apiResponse';

export const getTasks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tasks = await Task.find({}).sort({ createdAt: -1 });
    return sendSuccess(res, { data: tasks });
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return sendError(res, 'Please enter a task.', 400);
    }

    const newTask = new Task({
      title: title.trim(),
      status: 'Pending',
      createdBy: req.user?.userId ? req.user.userId : undefined,
    });

    await newTask.save();
    return sendSuccess(res, { data: newTask }, 201);
  } catch (error) {
    next(error);
  }
};

export const updateTaskStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Pending', 'Completed'].includes(status)) {
      return sendError(res, 'Invalid status value. Must be Pending or Completed.', 400);
    }

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedTask) {
      return sendError(res, 'Task not found', 404);
    }

    return sendSuccess(res, { data: updatedTask });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const deletedTask = await Task.findByIdAndDelete(id);

    if (!deletedTask) {
      return sendError(res, 'Task not found', 404);
    }

    return sendSuccess(res, { message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
};
