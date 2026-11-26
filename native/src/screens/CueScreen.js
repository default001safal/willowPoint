import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme.js';
import * as I from '../components/Icons.js';
import CueMark from '../components/CueMark.js';
import { useContent } from '../lib/content.js';
import { useCueChat } from '../lib/cueChat.js';
import { buildCuePrompts } from '../lib/selectors.js';

export function CueComposer({ inLayer = false }) {
  const { draft, setDraft, busy, ask, answerOpen } = useCueChat();
  const submit = () => { if (draft.trim() && !busy) ask(draft, { restart: !answerOpen }); };
  return (
    <View style={[styles.composer, inLayer && styles.composerInLayer]}>
      <View style={styles.cueBox}>
        <ComposerInput value={draft} onChange={setDraft} onSubmit={submit} />
        <View style={styles.cueBoxBar}>
          <Text style={styles.composerHint}>{busy ? 'Checking current records…' : 'Answers use current app records and sources'}</Text>
          <Pressable
            accessibilityLabel="Send question"
            onPress={submit}
            disabled={!draft.trim() || busy}
            style={[styles.cueSend, (!draft.trim() || busy) && styles.disabled]}
          >
            <I.ArrowUp size={18} color="#FFF" sw={2.2} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// Separate component so TextInput stays mounted without re-render churn.
function ComposerInput({ value, onChange, onSubmit }) {
  return (
    <TextInput
      style={styles.textarea}
      placeholder="Ask Cue anything…"
      placeholderTextColor={colors.faint}
      value={value}
      onChangeText={onChange}
      onSubmitEditing={onSubmit}
      blurOnSubmit
      returnKeyType="send"
      multiline
    />
  );
}

export function CueAnswerBody() {
  const { thread, ask, newQuestion } = useCueChat();
  const scrollRef = React.useRef(null);
  React.useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [thread.length]);
  return (
    <ScrollView ref={scrollRef} contentContainerStyle={styles.conversation} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
      {thread.map((message, index) => message.from === 'me' ? (
        <View key={`${index}-${message.text}`} style={styles.question}>
          <Text style={styles.questionLabel}>You asked</Text>
          <Text style={styles.questionText}>{message.text}</Text>
        </View>
      ) : (
        <View key={index} style={[styles.response, message.error && styles.responseError]}>
          <View style={styles.responseLabel}>
            <CueMark size={22} />
            <Text style={styles.responseLabelText}>Cue</Text>
          </View>
          <Text style={styles.responseText}>{message.text}</Text>
          {message.error ? (
            <Pressable style={styles.retry} onPress={() => ask(message.retryQuestion, { retry: true })}>
              <I.Swap size={15} color={colors.crimsonText} />
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          ) : null}
          {message.sources?.length > 0 && (
            <View style={styles.sourceList}>
              <Text style={styles.sourceListLabel}>Sources</Text>
              {message.sources.map((source, sourceIndex) => (
                <View key={`${source.label}-${sourceIndex}`} style={styles.sourceChip}>
                  <Text style={styles.sourceChipText}>{source.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
      <Pressable style={styles.threadReset} onPress={newQuestion}>
        <I.Plus size={14} color={colors.crimsonText} />
        <Text style={styles.threadResetText}>New question</Text>
      </Pressable>
    </ScrollView>
  );
}

export default function CueScreen({ navigation }) {
  const content = useContent();
  const { busy, answerOpen } = useCueChat();
  const prompts = buildCuePrompts(content);
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: 112 + insets.bottom }]}
      scrollEnabled={!answerOpen}>
      <View style={styles.cueHero}>
        <CueMark size={34} state={busy ? 'thinking' : 'idle'} animated />
        <Text style={styles.cueH}>Ask <Text style={styles.cueEm}>Cue</Text></Text>
      </View>
      <Text style={styles.cueSub}>Fixtures, results, stories — answered with sources.</Text>
      <View style={styles.cueSugg}>
        {prompts.map((prompt) => (
          <Pressable key={prompt.id} style={styles.chip} onPress={() => navigation.navigate('CueAnswer', { question: prompt.title })}>
            <CueMark size={14} />
            <Text style={styles.chipText}>{prompt.title}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.principles}>
        <Text style={styles.principle}><I.Check size={13} color={colors.faint} /> Current records</Text>
        <Text style={styles.principle}><I.Check size={13} color={colors.faint} /> Visible sources</Text>
        <Text style={styles.principle}><I.Check size={13} color={colors.faint} /> Honest when unavailable</Text>
      </View>
      {!answerOpen && <CueComposer />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: 20 },
  cueHero: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  cueH: { color: colors.text, fontSize: 20, fontWeight: '700' },
  cueEm: { color: colors.crimsonText, fontStyle: 'italic' },
  cueSub: { color: colors.muted, fontSize: 13.5, marginTop: 8, marginBottom: 20, textAlign: 'left' },
  cueSugg: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#57202A', borderRadius: 15, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: '#1E1214' },
  chipText: { color: colors.crimsonText, fontSize: 12.5, flexShrink: 1 },
  principles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  principle: { color: colors.faint, fontSize: 11.5 },
  composer: { marginTop: 18 },
  composerInLayer: { marginTop: 0 },
  cueBox: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, padding: 12, gap: 8 },
  textRow: { flexDirection: 'row' },
  textarea: { color: colors.text, fontSize: 14.5, minHeight: 44, textAlignVertical: 'top' },
  cueBoxBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  composerHint: { color: colors.faint, fontSize: 11, flex: 1, marginRight: 10 },
  cueSend: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.crimson, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.45 },
  conversation: { padding: 20, gap: 16 },
  question: { gap: 4 },
  questionLabel: { color: colors.faint, fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase' },
  questionText: { color: colors.text, fontSize: 17, fontWeight: '600', lineHeight: 23 },
  response: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, padding: 14, gap: 8 },
  responseError: { borderColor: '#57202A' },
  responseLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  responseLabelText: { color: colors.crimsonText, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '700' },
  responseText: { color: colors.text2, fontSize: 14, lineHeight: 21 },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  retryText: { color: colors.crimsonText, fontSize: 12.5, fontWeight: '600' },
  sourceList: { gap: 4 },
  sourceListLabel: { color: colors.faint, fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase' },
  sourceChip: { alignSelf: 'flex-start', backgroundColor: colors.surface2, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  sourceChipText: { color: colors.muted, fontSize: 11 },
  threadReset: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center', marginTop: 4 },
  threadResetText: { color: colors.crimsonText, fontSize: 12.5 },
});
