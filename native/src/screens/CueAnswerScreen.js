import React, { useEffect } from 'react';
import Screen from '../components/Screen.js';
import { CueAnswerBody, CueComposer } from './CueScreen.js';
import { useCueChat } from '../lib/cueChat.js';

// Push-layer "Ask Cue" conversation. A question passed via route params starts a
// fresh thread (same as the web app's pending-question restart).
export default function CueAnswerScreen({ navigation, route }) {
  const { ask, setAnswerOpen } = useCueChat();
  const question = route.params?.question;

  useEffect(() => {
    if (question) ask(question, { restart: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question]);

  const close = () => {
    setAnswerOpen(false);
    navigation.goBack();
  };

  return (
    <Screen title="Ask Cue" eyebrow="Grounded answer" onClose={close} footer={<CueComposer inLayer />}>
      <CueAnswerBody />
    </Screen>
  );
}
