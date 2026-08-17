import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet, Text } from 'react-native';

import { Colors, MaxContentWidth, Spacing, BorderRadius } from '@/constants/theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%', backgroundColor: Colors.dark.background }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="canvas" href="/" asChild>
            <TabButton accentColor={Colors.dark.canvas}>⚡ Canvas</TabButton>
          </TabTrigger>
          <TabTrigger name="synapse" href="/synapse" asChild>
            <TabButton accentColor={Colors.dark.synapse}>🧠 Synapse</TabButton>
          </TabTrigger>
          <TabTrigger name="tasks" href="/tasks" asChild>
            <TabButton accentColor={Colors.dark.tasks}>📋 Tasks</TabButton>
          </TabTrigger>
          <TabTrigger name="habits" href="/habits" asChild>
            <TabButton accentColor={Colors.dark.habits}>🌿 Habits</TabButton>
          </TabTrigger>
          <TabTrigger name="ledger" href="/ledger" asChild>
            <TabButton accentColor={Colors.dark.ledger}>💎 Ledger</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

interface CustomTabButtonProps extends TabTriggerSlotProps {
  accentColor?: string;
}

export function TabButton({ children, isFocused, accentColor = Colors.dark.canvas, ...props }: CustomTabButtonProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <View
        style={[
          styles.tabButtonView,
          isFocused && {
            backgroundColor: `${accentColor}25`,
            borderColor: `${accentColor}60`,
          },
        ]}>
        <Text
          style={[
            styles.tabButtonText,
            { color: isFocused ? accentColor : Colors.dark.textSecondary },
          ]}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={styles.innerContainer}>
        <View style={styles.brandContainer}>
          <View style={styles.brandDot} />
          <Text style={styles.brandText}>SyncSpace</Text>
        </View>

        <View style={styles.tabsRow}>{props.children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: Spacing.three,
    width: '100%',
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    backgroundColor: 'rgba(18, 20, 26, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexGrow: 1,
    maxWidth: MaxContentWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    marginRight: Spacing.three,
  },
  brandDot: {
    width: 9,
    height: 9,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dark.canvas,
  },
  brandText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.dark.text,
    letterSpacing: -0.3,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  pressed: {
    opacity: 0.75,
  },
  tabButtonView: {
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
