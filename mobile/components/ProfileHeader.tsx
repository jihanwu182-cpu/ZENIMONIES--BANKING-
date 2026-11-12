
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import colors from '../theme/colors';

const PROFILE_PHOTO_URL =
  'https://zenimonies-banking.onrender.com/api/profile/photo';

type Props = {
  userName: string;
  token: string;
  profilePhoto?: string | null;
  onPhotoUpdated: (photo: string) => void;
  onLogout: () => void;
};

type UploadResponse = {
  success?: boolean;
  message?: string;
  profile_photo?: string;
};

export default function ProfileHeader({
  userName,
  token,
  profilePhoto,
  onPhotoUpdated,
  onLogout,
}: Props) {
  const [uploading, setUploading] = useState(false);

  const handlePickPhoto = async () => {
    if (uploading) return;

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Photo access required',
          'Please allow photo-library access to choose your profile picture.'
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.75,
        });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const photo = result.assets[0];

      if (photo.fileSize && photo.fileSize > 2 * 1024 * 1024) {
        Alert.alert(
          'Image too large',
          'Please choose an image smaller than 2 MB.'
        );
        return;
      }

      const formData = new FormData();

      formData.append(
        'profile_photo',
        {
          uri: photo.uri,
          name: photo.fileName || 'profile-photo.jpg',
          type: photo.mimeType || 'image/jpeg',
        } as any
      );

      setUploading(true);

      const response = await fetch(PROFILE_PHOTO_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      let data: UploadResponse;

      try {
        data = await response.json();
      } catch {
        throw new Error('The server returned an invalid response.');
      }

      if (!response.ok || data.success !== true || !data.profile_photo) {
        throw new Error(
          data.message || 'Your profile photo could not be uploaded.'
        );
      }

      onPhotoUpdated(data.profile_photo);

      Alert.alert(
        'Photo updated',
        'Your profile picture has been saved successfully.'
      );
    } catch (error) {
      Alert.alert(
        'Photo upload failed',
        error instanceof Error
          ? error.message
          : 'Please try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.identity}>
        <TouchableOpacity
          style={styles.photoButton}
          onPress={handlePickPhoto}
          disabled={uploading}
          accessibilityRole="button"
          accessibilityLabel="Change profile photo"
        >
          {profilePhoto ? (
            <Image
              source={{ uri: profilePhoto }}
              style={styles.photo}
            />
          ) : (
            <Text style={styles.logoText}>Z</Text>
          )}

          {uploading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={colors.white} />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.nameArea}>
          <Text style={styles.customerName} numberOfLines={2}>
            {userName}
          </Text>
          <Text style={styles.photoHint}>
            {uploading ? 'Uploading photo...' : 'Tap Z to change photo'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={onLogout}
      >
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 86,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  photoButton: {
    width: 58,
    height: 58,
    borderRadius: 13,
    backgroundColor: colors.primary,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  logoText: {
    color: colors.white,
    fontSize: 35,
    fontWeight: '900',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameArea: {
    flex: 1,
    marginLeft: 12,
  },
  customerName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  photoHint: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 4,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  logoutText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 12,
  },
});
