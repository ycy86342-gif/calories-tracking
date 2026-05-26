// src/api/base44Client.js
export const base44 = {
  auth: {
    me: async () => ({
      id: "user_01",
      name: "User Profile",
      daily_calories_goal: 2000,
      daily_protein_goal: 150,
      daily_carbs_goal: 200,
      daily_fat_goal: 65
    })
  },
  entities: {
    FoodLog: {
      filter: async () => [],
      create: async (data) => data,
      delete: async () => true
    },
    BodyMeasurement: {
      filter: async () => [],
      create: async (data) => data,
      delete: async () => true
    },
    FoodDatabase: {
      filter: async () => [],
      create: async (data) => data
    }
  }
};
