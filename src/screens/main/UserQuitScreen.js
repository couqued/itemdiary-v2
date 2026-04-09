import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors} from '../../constants/colors';
import {typography} from '../../constants/typography';
import {spacing, radius} from '../../constants/spacing';
import {Input} from '../../components/ui/Input';
import {Button} from '../../components/ui/Button';
import {LoadingOverlay} from '../../components/ui/LoadingOverlay';
import {supabase} from '../../lib/supabase';

function UserQuitScreen({navigation}) {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');

  const onQuit = () => {
    Alert.alert('', '정말 탈퇴 하시겠습니까?', [
      {text: '취소', style: 'cancel'},
      {
        text: '탈퇴하기',
        style: 'destructive',
        onPress: doQuit,
      },
    ]);
  };

  const doQuit = async () => {
    if (!password.trim()) {
      Alert.alert('', '패스워드를 입력해주세요.', [{text: '확인'}]);
      return;
    }

    setLoading(true);

    const {
      data: {user},
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      Alert.alert('', 'ID를 확인할 수 없습니다.');
      return;
    }

    const {error: signInError} = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });

    if (signInError) {
      setLoading(false);
      Alert.alert('', '비밀번호를 확인해주세요.', [{text: '확인'}]);
      return;
    }

    const {error: deleteError} = await supabase
      .from('items')
      .delete()
      .eq('user_id', user.email);

    if (deleteError) {
      setLoading(false);
      Alert.alert('', '탈퇴처리에 실패하였습니다.', [{text: '확인'}]);
      return;
    }

    await supabase.auth.signOut();
    setLoading(false);
    navigation.reset({routes: [{name: 'SignUp'}]});
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Icon name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>회원 탈퇴</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.warningBox}>
          <Icon name="warning-outline" size={24} color={colors.warning} style={{marginRight: spacing.sm}} />
          <Text style={styles.warningText}>
            탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
          </Text>
        </View>

        <Input
          label="패스워드 확인"
          value={password}
          onChangeText={setPassword}
          placeholder="패스워드를 입력해주세요"
          secureTextEntry
          maxLength={30}
          returnKeyType="done"
        />

        <Button
          title="탈퇴하기"
          onPress={onQuit}
          variant="danger"
          style={{marginTop: spacing.lg}}
        />
      </ScrollView>

      {loading && <LoadingOverlay />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerBtn: {
    padding: spacing.sm,
    width: 44,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xl,
  },
  warningText: {
    ...typography.caption,
    color: '#92400E',
    flex: 1,
  },
});

export default UserQuitScreen;
