/**
 * AppAlert — drop-in replacement for React Native's Alert.alert()
 *
 * Usage (identical API to Alert.alert):
 *   import { AppAlert } from '@/components/ui/AppAlert';
 *
 *   AppAlert.alert('Title', 'Message', [
 *     { text: 'Cancel', style: 'cancel' },
 *     { text: 'Delete', style: 'destructive', onPress: () => {} },
 *     { text: 'OK', onPress: () => {} },
 *   ]);
 *
 * Wrap your root layout with <AlertProvider> to enable it.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Animated,
  useColorScheme,
  StyleSheet,
  Dimensions,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

type ButtonStyle = 'default' | 'cancel' | 'destructive';

interface AlertButton {
  text: string;
  style?: ButtonStyle;
  onPress?: () => void;
}

interface AlertConfig {
  title?: string;
  message?: string;
  buttons?: AlertButton[];
}

interface AlertContextValue {
  show: (config: AlertConfig) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AlertContext = createContext<AlertContextValue | null>(null);

// ─── Singleton ref (for imperative API) ──────────────────────────────────────

let _showAlert: ((config: AlertConfig) => void) | null = null;

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertConfig>({});
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const isDark = useColorScheme() === 'dark';

  const show = useCallback((cfg: AlertConfig) => {
    setConfig(cfg);
    setVisible(true);
  }, []);

  // Register singleton
  useEffect(() => {
    _showAlert = show;
    return () => { _showAlert = null; };
  }, [show]);

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.88);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 280,
          friction: 22,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const dismiss = (onPress?: () => void) => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.88,
        useNativeDriver: true,
        tension: 280,
        friction: 22,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      onPress?.();
    });
  };

  const buttons: AlertButton[] = config.buttons?.length
    ? config.buttons
    : [{ text: 'OK', style: 'default' }];

  const cancelBtn = buttons.find(b => b.style === 'cancel');
  const actionBtns = buttons.filter(b => b.style !== 'cancel');
  const orderedBtns = cancelBtn ? [...actionBtns, cancelBtn] : actionBtns;

  // Layout: if 2 buttons and no destructive, use side-by-side
  const useSideBySide =
    orderedBtns.length === 2 &&
    !orderedBtns.some(b => b.style === 'destructive');

  const s = isDark ? dark : light;

  return (
    <AlertContext.Provider value={{ show }}>
      {children}
      <Modal
        transparent
        visible={visible}
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => dismiss(cancelBtn?.onPress)}
      >
        <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => dismiss(cancelBtn?.onPress)}
          />
          <Animated.View
            style={[
              styles.sheet,
              s.sheet,
              { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
            ]}
          >
            {/* Title */}
            {config.title ? (
              <Text style={[styles.title, s.title]}>{config.title}</Text>
            ) : null}

            {/* Message */}
            {config.message ? (
              <Text style={[styles.message, s.message]}>{config.message}</Text>
            ) : null}

            {/* Divider */}
            <View style={[styles.divider, s.divider]} />

            {/* Buttons */}
            {useSideBySide ? (
              <View style={styles.rowButtons}>
                {orderedBtns.map((btn, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <View style={[styles.verticalDivider, s.divider]} />}
                    <TouchableOpacity
                      style={[styles.rowBtn]}
                      activeOpacity={0.6}
                      onPress={() => dismiss(btn.onPress)}
                    >
                      <Text style={[styles.btnText, s.btnText, getTextStyle(btn.style, isDark)]}>
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  </React.Fragment>
                ))}
              </View>
            ) : (
              <View style={styles.stackButtons}>
                {orderedBtns.map((btn, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <View style={[styles.divider, s.divider]} />}
                    <TouchableOpacity
                      style={styles.stackBtn}
                      activeOpacity={0.6}
                      onPress={() => dismiss(btn.onPress)}
                    >
                      <Text style={[styles.btnText, s.btnText, getTextStyle(btn.style, isDark)]}>
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  </React.Fragment>
                ))}
              </View>
            )}
          </Animated.View>
        </Animated.View>
      </Modal>
    </AlertContext.Provider>
  );
}

// ─── Imperative API ───────────────────────────────────────────────────────────

export const AppAlert = {
  alert(
    title?: string,
    message?: string,
    buttons?: AlertButton[]
  ) {
    if (!_showAlert) {
      console.warn('AppAlert: AlertProvider is not mounted.');
      return;
    }
    _showAlert({ title, message, buttons });
  },
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAppAlert must be used within AlertProvider');
  return ctx;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTextStyle(style?: ButtonStyle, isDark?: boolean) {
  if (style === 'destructive') return { color: '#FF3B30' };
  if (style === 'cancel') return { color: isDark ? '#636366' : '#8E8E93' };
  return {};
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  sheet: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    overflow: 'hidden',
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.3,
    textAlign: 'center',
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  stackButtons: {},
  stackBtn: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowButtons: {
    flexDirection: 'row',
  },
  rowBtn: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  btnText: {
    fontSize: 17,
    letterSpacing: -0.2,
  },
});

const light = StyleSheet.create({
  sheet: {
    backgroundColor: '#F5F5F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.18,
    shadowRadius: 40,
    elevation: 20,
  },
  title: {
    color: '#1A1A1C',
    fontFamily: 'Inter_600SemiBold',
  },
  message: {
    color: '#636366',
    fontFamily: 'Inter_400Regular',
  },
  divider: {
    backgroundColor: 'rgba(0,0,0,0.10)',
  },
  btnText: {
    color: '#14b8a6',
    fontFamily: 'Inter_500Medium',
  },
});

const dark = StyleSheet.create({
  sheet: {
    backgroundColor: '#1C1C1E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  title: {
    color: '#F5F5F7',
    fontFamily: 'Inter_600SemiBold',
  },
  message: {
    color: '#98989D',
    fontFamily: 'Inter_400Regular',
  },
  divider: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  btnText: {
    color: '#14b8a6',
    fontFamily: 'Inter_500Medium',
  },
});