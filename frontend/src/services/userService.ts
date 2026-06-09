import api from '@/lib/api';
import { User } from '@/types';

export const userService = {
  async getMe(): Promise<User> {
    const { data } = await api.get('/users/me');
    return data;
  },

  async updateMe(payload: { name: string }): Promise<User> {
    const { data } = await api.patch('/users/me', payload);
    return data;
  },
};
