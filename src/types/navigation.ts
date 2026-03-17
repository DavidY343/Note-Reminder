export type RootStackParamList = {
  Home: undefined;
  CreateNote: { 
    noteId?: string;
    initialTitle?: string;
    initialConcept?: string;
    initialAlarmDate?: string;
  };
};
