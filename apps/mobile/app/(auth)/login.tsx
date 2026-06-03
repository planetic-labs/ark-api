import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator, 
  Platform,
  Keyboard
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router } from 'expo-router';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/useAuthStore';
import { COLORS, FONTS } from '../../constants/Config';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isFirstNameFocused, setIsFirstNameFocused] = useState(false);
  const [isLastNameFocused, setIsLastNameFocused] = useState(false);
  const [step, setStep] = useState<'email' | 'code' | 'profile' | 'waiting'>('email');
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [resendTimer, setResendTimer] = useState(43);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [setupToken, setSetupToken] = useState('');
  
  const setAuth = useAuthStore((state) => state.setAuth);
  const accessToken = useAuthStore((state) => state.accessToken);
  const storedUser = useAuthStore((state) => state.user);

  const codeInputRef = useRef<TextInput>(null);

  // Focus effect for code inputs
  useEffect(() => {
    if (step === 'code') {
      setTimeout(() => {
        codeInputRef.current?.focus();
      }, 300);
    }
  }, [step]);

  // Resend timer countdown
  useEffect(() => {
    let interval: any;
    if (step === 'code' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  useEffect(() => {
    if (accessToken && storedUser) {
      if (!storedUser.is_approved) {
        setStep('waiting');
      } else if (!storedUser.full_name) {
        setStep('profile');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [accessToken, storedUser]);

  const handleRequestCode = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const response = await api.auth.identify(email.trim().toLowerCase());
      if (response && response.error === 'not_found') {
        throw new Error('Email не зарегистрирован в системе или учетная запись отключена');
      }
      setStep('code');
      setResendTimer(43);
      setCode('');
    } catch (error: any) {
      Alert.alert('Ошибка', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (currentCode: string) => {
    if (currentCode.length !== 6 || loading) return;
    setLoading(true);
    try {
      // 1. Get tokens / action
      const response = await api.auth.verifyCode(email.trim().toLowerCase(), currentCode);
      if (!response) {
        throw new Error('Неверный код или пользователь неактивен');
      }
      
      if (response.next === 'setup_profile') {
        setSetupToken(response.setup_token || '');
        setStep('profile');
      } else if (response.next === 'home') {
        // 2. Fetch profile using the new token
        const user = await api.users.me(response.access_token);
        
        // 3. Set auth state
        setAuth(user, response.access_token, response.refresh_token);
      }
      
      // Step transition is handled by useEffect on storedUser / accessToken
    } catch (error: any) {
      Alert.alert('Ошибка', error.message);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (text: string) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    setCode(cleanText);
    if (cleanText.length === 6) {
      handleVerifyCode(cleanText);
    }
  };

  const handleProfileSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Ошибка', 'Пожалуйста, введите имя и фамилию');
      return;
    }
    setLoading(true);
    try {
      const tokens = await api.auth.setup(setupToken, firstName.trim(), lastName.trim(), undefined);
      if (!tokens) {
        throw new Error('Не удалось завершить регистрацию');
      }
      const user = await api.users.me(tokens.access_token);
      setAuth(user, tokens.access_token, tokens.refresh_token);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Ошибка', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWriteAdmin = () => {
    // Return to login screen for this demo / logout
    useAuthStore.getState().logout();
    setStep('email');
    setEmail('');
    setCode('');
  };

  const renderEmailStep = () => (
    <View style={styles.content}>
      <View style={styles.brandMarkContainer}>
        <Text style={styles.brandMark}>К</Text>
      </View>

      <Text style={styles.title}>
        Войти{'\n'}в <Text style={styles.italicTitle}>Ковчег</Text>
      </Text>
      <Text style={styles.subtitle}>Введите email — отправим код для входа.</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={[styles.input, isFocused && styles.inputFocused]}
        placeholder="alexey.prusikov@gmail.com"
        placeholderTextColor={COLORS.textFaint}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleRequestCode}
        disabled={loading || !email}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Получить код</Text>
        )}
      </TouchableOpacity>

      <View style={styles.spacer} />

      <Text style={styles.footnote}>
        Доступ только по приглашению.{'\n'}
        Если адреса нет в списке — обратитесь к Воину, через которого вы пришли.
      </Text>
    </View>
  );

  const renderCodeStep = () => {
    const cells = Array(6).fill(null);
    return (
      <View style={styles.content}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => setStep('email')}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          Код <Text style={styles.italicTitle}>подтверждения</Text>
        </Text>
        <Text style={styles.subtitle}>
          Письмо ушло на{'\n'}
          <Text style={styles.boldSubtitle}>{email}</Text>
        </Text>

        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => codeInputRef.current?.focus()}
          style={styles.cellsContainer}
        >
          {cells.map((_, index) => {
            const digit = code[index];
            const isCurrent = index === code.length;
            return (
              <View 
                key={index} 
                style={[
                  styles.cell, 
                  digit !== undefined && styles.cellFilled,
                  isCurrent && isInputFocused && styles.cellActive
                ]}
              >
                {digit !== undefined ? (
                  <Text style={styles.cellText}>{digit}</Text>
                ) : isCurrent && isInputFocused ? (
                  <View style={styles.cursor} />
                ) : null}
              </View>
            );
          })}
        </TouchableOpacity>

        {/* Hidden inputs to capture key events */}
        <TextInput
          ref={codeInputRef}
          style={styles.hiddenInput}
          value={code}
          onChangeText={handleCodeChange}
          keyboardType="number-pad"
          maxLength={6}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
        />

        <View style={styles.resendRow}>
          <TouchableOpacity 
            disabled={resendTimer > 0 || loading}
            onPress={handleRequestCode}
          >
            <Text style={[styles.linklike, resendTimer > 0 && { color: COLORS.textMuted }]}>
              Отправить заново
            </Text>
          </TouchableOpacity>
          {resendTimer > 0 && (
            <Text style={styles.timer}>
              0:{resendTimer < 10 ? `0${resendTimer}` : resendTimer}
            </Text>
          )}
        </View>

        <View style={styles.spacer} />

        <Text style={styles.footnote}>
          Письмо не пришло? Проверьте папку «Спам»{'\n'}или попробуйте другой адрес.
        </Text>
      </View>
    );
  };

  const renderProfileStep = () => (
    <View style={styles.content}>
      <Text style={styles.title}>
        Как вас <Text style={styles.italicTitle}>называть?</Text>
      </Text>
      <Text style={styles.subtitle}>Имя и фото видят другие участники в чатах и отчётах.</Text>

      <View style={styles.avatarPickContainer}>
        <View style={styles.avatarPick}>
          <Text style={styles.avatarPickIcon}>📷</Text>
          <View style={styles.avatarPlus}>
            <Text style={styles.avatarPlusText}>+</Text>
          </View>
        </View>
      </View>

      <Text style={styles.label}>Имя</Text>
      <TextInput
        style={[styles.input, isFirstNameFocused && styles.inputFocused]}
        placeholder="Алексей"
        placeholderTextColor={COLORS.textFaint}
        value={firstName}
        onChangeText={setFirstName}
        autoCapitalize="words"
        onFocus={() => setIsFirstNameFocused(true)}
        onBlur={() => setIsFirstNameFocused(false)}
      />

      <Text style={styles.label}>Фамилия</Text>
      <TextInput
        style={[styles.input, isLastNameFocused && styles.inputFocused]}
        placeholder="Прусиков"
        placeholderTextColor={COLORS.textFaint}
        value={lastName}
        onChangeText={setLastName}
        autoCapitalize="words"
        onFocus={() => setIsLastNameFocused(true)}
        onBlur={() => setIsLastNameFocused(false)}
      />

      <Text style={styles.fieldFootnote}>
        Имя и фамилию можно изменить позже в профиле. По правилам общины вводите свои настоящие имя и фамилию.
      </Text>

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleProfileSubmit}
        disabled={!firstName.trim() || !lastName.trim()}
      >
        <Text style={styles.buttonText}>Продолжить</Text>
      </TouchableOpacity>

      <View style={styles.spacer} />
    </View>
  );

  const renderWaitingStep = () => (
    <View style={styles.content}>
      <View style={styles.waitMarkContainer}>
        <View style={styles.waitMarkDot} />
      </View>

      <Text style={[styles.title, { textAlign: 'center' }]}>
        Заявка <Text style={styles.italicTitle}>принята</Text>
      </Text>
      <Text style={[styles.subtitle, { textAlign: 'center', marginBottom: 32 }]}>
        Воины уже одобрили вас. Осталось подтверждение от Администратора.
      </Text>

      <View style={styles.waitSteps}>
        <View style={styles.waitStep}>
          <View style={[styles.marker, styles.markerDone]}>
            <Text style={styles.markerCheck}>✓</Text>
          </View>
          <View style={styles.stepBody}>
            <Text style={[styles.stepText, styles.stepTextMuted]}>Заявка отправлена</Text>
            <Text style={styles.stepWhen}>9:43, 21 мая</Text>
          </View>
        </View>

        <View style={styles.waitStep}>
          <View style={[styles.marker, styles.markerNow]} />
          <View style={styles.stepBody}>
            <Text style={styles.stepText}>
              Алексей свяжется с вами по email и подскажет, как оплатить
            </Text>
            <Text style={styles.stepWhen}>обычно — в течение суток</Text>
          </View>
        </View>

        <View style={[styles.waitStep, { borderBottomWidth: 0 }]}>
          <View style={[styles.marker, styles.markerNext]} />
          <View style={styles.stepBody}>
            <Text style={[styles.stepText, styles.stepTextMuted]}>
              После оплаты — доступ ко всем чатам и материалам
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.button, styles.buttonGhost]} 
        onPress={handleWriteAdmin}
      >
        <Text style={styles.buttonTextGhost}>Написать Алексею</Text>
      </TouchableOpacity>

      <View style={styles.spacer} />
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoidingView}
    >
      <View style={styles.container}>
        {step === 'email' && renderEmailStep()}
        {step === 'code' && renderCodeStep()}
        {step === 'profile' && renderProfileStep()}
        {step === 'waiting' && renderWaitingStep()}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 32,
  },
  content: {
    flex: 1,
  },
  brandMarkContainer: {
    marginTop: 20,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  brandMark: {
    fontSize: 24,
    color: COLORS.amber,
    fontFamily: FONTS.displaySemiBold,
    borderWidth: 1.5,
    borderColor: COLORS.amber,
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 6,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
    marginVertical: 12,
  },
  backArrow: {
    fontSize: 24,
    color: COLORS.textSecondary,
  },
  title: {
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.3,
    color: COLORS.textPrimary,
    fontFamily: FONTS.display,
    marginBottom: 14,
  },
  italicTitle: {
    fontStyle: 'italic',
    color: COLORS.amber,
  },
  subtitle: {
    fontSize: 14.5,
    lineHeight: 22,
    color: COLORS.textSecondary,
    marginBottom: 36,
    fontFamily: FONTS.bodyLight,
  },
  boldSubtitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.bodySemiBold,
  },
  label: {
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    fontFamily: FONTS.mono,
    marginBottom: 10,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.textPrimary,
    fontFamily: FONTS.body,
    width: '100%',
    marginBottom: 28,
  },
  inputFocused: {
    borderColor: COLORS.amber,
  },
  button: {
    backgroundColor: COLORS.amber,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: FONTS.bodyMedium,
  },
  buttonTextGhost: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontFamily: FONTS.bodyMedium,
  },
  spacer: {
    flex: 1,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontFamily: FONTS.bodyLight,
    marginBottom: 12,
  },
  cellsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    width: '100%',
  },
  cell: {
    width: 44,
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  cellFilled: {
    borderColor: COLORS.borderStrong,
  },
  cellActive: {
    borderColor: COLORS.amber,
  },
  cellText: {
    fontSize: 22,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bodyMedium,
  },
  cursor: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.amber,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  linklike: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: FONTS.body,
  },
  timer: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
  },
  avatarPickContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatarPick: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarPickIcon: {
    fontSize: 28,
  },
  avatarPlus: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.amber,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlusText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: FONTS.bodySemiBold,
    lineHeight: 18,
  },
  fieldFootnote: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textMuted,
    fontFamily: FONTS.bodyLight,
    marginBottom: 28,
    marginTop: -14,
  },
  waitMarkContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 24,
  },
  waitMarkDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.amber,
  },
  waitSteps: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.bgSurface,
    paddingVertical: 14,
    marginBottom: 28,
  },
  waitStep: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
    alignItems: 'flex-start',
  },
  marker: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 14,
    marginTop: 2,
  },
  markerDone: {
    backgroundColor: COLORS.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerCheck: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
  },
  markerNow: {
    borderWidth: 4.5,
    borderColor: COLORS.amber,
    backgroundColor: '#ffffff',
  },
  markerNext: {
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    backgroundColor: 'transparent',
  },
  stepBody: {
    flex: 1,
  },
  stepText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textPrimary,
    fontFamily: FONTS.body,
  },
  stepTextMuted: {
    color: COLORS.textMuted,
  },
  stepWhen: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
    marginTop: 4,
  },
});
