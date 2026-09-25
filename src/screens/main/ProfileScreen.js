import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import VersionCheck from 'react-native-version-check';
import {colors} from '../../constants/colors';
import {typography} from '../../constants/typography';
import {spacing, radius} from '../../constants/spacing';
import {formatPrice} from '../../utils/formatPrice';
import {supabase} from '../../lib/supabase';
import {CustomAlert} from '../../components/ui';
import {isRemindersEnabled, setRemindersEnabled, isNewsEnabled, setNewsEnabled} from '../../lib/reminders';
import {SHOW_NOTIFICATION_TEST} from '../../dev/flags';
import {NotificationTestPanel} from '../../dev/NotificationTestPanel';

function ProfileScreen({navigation}) {
  const [remindersOn, setRemindersOn] = useState(true);
  const [newsOn, setNewsOn] = useState(true);
  useEffect(() => {
    isRemindersEnabled().then(setRemindersOn);
    isNewsEnabled().then(setNewsOn);
  }, []);
  const onToggleReminders = async value => {
    setRemindersOn(value);
    await setRemindersEnabled(value);
  };
  const onToggleNews = async value => {
    setNewsOn(value);
    await setNewsEnabled(value);
  };
  const isFocused = useIsFocused();
  const [appVersion, setAppVersion] = useState('');
  const [latestVersion, setLatestVersion] = useState('');
  const [stats, setStats] = useState({total: 0, totalSpent: 0, monthSpent: 0});
  const [userEmail, setUserEmail] = useState('');
  const [logoutVisible, setLogoutVisible] = useState(false);

  useEffect(() => {
    if (!isFocused) return;

    setAppVersion(VersionCheck.getCurrentVersion() || '');
    VersionCheck.getLatestVersion({provider: 'playStore'})
      .then(v => setLatestVersion(v || ''))
      .catch(() => {});

    fetchStats();
  }, [isFocused]);

  const fetchStats = async () => {
    const {
      data: {user},
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserEmail(user.email);

    const {data} = await supabase
      .from('items')
      .select('price, item_date')
      .eq('user_id', user.email);

    if (!data) return;

    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const total = data.length;
    const totalSpent = data.reduce((sum, i) => sum + (i.price || 0), 0);
    const monthSpent = data
      .filter(i => i.item_date && i.item_date.startsWith(thisMonth))
      .reduce((sum, i) => sum + (i.price || 0), 0);

    setStats({total, totalSpent, monthSpent});
  };

  const handleLogout = async () => {
    setLogoutVisible(false);
    await supabase.auth.signOut();
  };

  const goQuit = () => {
    navigation.navigate('Quit');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* 사용자 정보 */}
        <View style={styles.userSection}>
          <View style={styles.avatar}>
            <Icon name="person" size={32} color={colors.textInverse} />
          </View>
          <Text style={styles.email}>{userEmail}</Text>
        </View>

        {/* 통계 카드 */}
        <View style={styles.statsRow}>
          <StatCard label="총 아이템" value={`${stats.total}개`} icon="cube-outline" />
          <StatCard
            label="총 지출"
            value={`${formatPrice(stats.totalSpent)}원`}
            icon="wallet-outline"
          />
          <StatCard
            label="이번달"
            value={`${formatPrice(stats.monthSpent)}원`}
            icon="calendar-outline"
          />
        </View>

        {/* 메뉴 */}
        <View style={styles.menuSection}>
          <View style={styles.menuItem}>
            <View style={[styles.menuLeft, {flex: 1}]}>
              <Icon name="notifications-outline" size={22} color={colors.textSecondary} style={{marginRight: spacing.md}} />
              <View style={{flex: 1}}>
                <Text style={styles.menuLabel}>일정 알림</Text>
                <Text style={styles.menuHint}>
                  보증 만료·소모품 교체·배터리 점검일에 오전 9시 알림. 알림이 오지 않으면 휴대폰 설정에서 이 앱의 배터리 최적화를 꺼주세요.
                </Text>
              </View>
            </View>
            <Switch
              value={remindersOn}
              onValueChange={onToggleReminders}
              trackColor={{true: colors.primary}}
            />
          </View>
          <View style={styles.menuItem}>
            <View style={[styles.menuLeft, {flex: 1}]}>
              <Icon name="sparkles-outline" size={22} color={colors.textSecondary} style={{marginRight: spacing.md}} />
              <View style={{flex: 1}}>
                <Text style={styles.menuLabel}>소식 알림</Text>
                <Text style={styles.menuHint}>
                  찜 목록 알림, 함께한 지 N년, 월간 요약 등
                </Text>
              </View>
            </View>
            <Switch
              value={newsOn}
              onValueChange={onToggleNews}
              trackColor={{true: colors.primary}}
            />
          </View>
          <MenuItem icon="log-out-outline" label="로그아웃" onPress={() => setLogoutVisible(true)} />
          <MenuItem
            icon="person-remove-outline"
            label="탈퇴하기"
            onPress={goQuit}
            danger
          />
          <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Icon name="information-circle-outline" size={22} color={colors.textSecondary} />
              <Text style={styles.menuLabel}>앱 버전</Text>
            </View>
            <Text style={styles.versionText}>
              {appVersion}
              {latestVersion ? ` (최신: ${latestVersion})` : ''}
            </Text>
          </View>
        </View>

        {SHOW_NOTIFICATION_TEST && <NotificationTestPanel />}
      </ScrollView>

      <CustomAlert
        visible={logoutVisible}
        title="로그아웃"
        message="로그아웃 하시겠습니까?"
        confirmText="로그아웃"
        onConfirm={handleLogout}
        onCancel={() => setLogoutVisible(false)}
      />
    </SafeAreaView>
  );
}

function StatCard({label, value, icon}) {
  return (
    <View style={styles.statCard}>
      <Icon name={icon} size={22} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({icon, label, onPress, danger}) {
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [
        styles.menuItem,
        pressed && {backgroundColor: colors.surfaceSecondary},
      ]}>
      <View style={styles.menuLeft}>
        <Icon
          name={icon}
          size={22}
          color={danger ? colors.danger : colors.textSecondary}
          style={{marginRight: spacing.md}}
        />
        <Text style={[styles.menuLabel, danger && {color: colors.danger}]}>
          {label}
        </Text>
      </View>
      <Icon name="chevron-forward" size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  userSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  email: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    ...typography.captionBold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  statLabel: {
    ...typography.small,
    color: colors.textTertiary,
    marginTop: 2,
  },
  menuSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.md,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuHint: {
    ...typography.small,
    color: colors.textTertiary,
    marginTop: 2,
    marginRight: spacing.sm,
  },
  menuLabel: {
    ...typography.body,
    color: colors.text,
  },
  versionText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
});

export default ProfileScreen;
