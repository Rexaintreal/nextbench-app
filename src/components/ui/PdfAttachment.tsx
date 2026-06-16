/**
 * PdfAttachment.tsx (React Native)
 * Renders PDF pages as images using Cloudinary's pg_N transformation.
 * No download needed — just display each page like the web version does.
 */

import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
  Platform,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import { FileText, X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';

interface PdfAttachmentProps {
  pdfUrl: string;
  totalPages?: number;
  title?: string;
  isDark?: boolean;
}

/**
 * Cloudinary's pg_N transformation converts PDF pages to images.
 * For secure URLs (HTTPS), we need to use the delivery URL format.
 * 
 * Original: https://res.cloudinary.com/cloud/image/upload/v123/path/file.pdf
 * Page URL: https://res.cloudinary.com/cloud/image/upload/pg_1,w_600,f_jpg,q_auto/v123/path/file.pdf
 */
function getPdfPageUrl(url: string, page: number, width: number = 1200): string {
  // Extract cloud name from URL
  const cloudMatch = url.match(/res\.cloudinary\.com\/([^/]+)/);
  if (!cloudMatch) {
    return url;
  }

  const cloudName = cloudMatch[1];
  
  // Extract the part after /upload/
  const uploadMatch = url.match(/\/upload\/(.+)$/);
  if (!uploadMatch) {
    return url;
  }

  const uploadPath = uploadMatch[1];
  
  // Rebuild with pg_N transformation BEFORE the version
  // Format: /upload/pg_N,w_WIDTH,f_jpg,q_auto/UPLOAD_PATH
  const transformedUrl = `https://res.cloudinary.com/${cloudName}/image/upload/pg_${page},w_${width},f_jpg,q_auto/${uploadPath}`;
  
  return transformedUrl;
}

export default function PdfAttachment({
  pdfUrl,
  totalPages = 1,
  title,
  isDark = false,
}: PdfAttachmentProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingPages, setLoadingPages] = useState<Set<number>>(new Set());
  const [failedPages, setFailedPages] = useState<Set<number>>(new Set());

  const cardBg = isDark ? '#2C2C2E' : '#F5F5F7';
  const borderClr = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const iconBg = isDark ? '#3A3A3C' : '#E5E5EA';
  const teal = '#14B8A6';
  const red = '#FF375F';
  const { width: screenWidth } = Dimensions.get('window');

  const previewPageUrl = getPdfPageUrl(pdfUrl, 1, 600);

  const handlePageLoad = (page: number) => {
    setLoadingPages(prev => {
      const next = new Set(prev);
      next.delete(page);
      return next;
    });
  };

  const handlePageStart = (page: number) => {
    setLoadingPages(prev => new Set(prev).add(page));
  };

  const handlePageError = (page: number, error: any) => {
    setFailedPages(prev => new Set(prev).add(page));
    setLoadingPages(prev => {
      const next = new Set(prev);
      next.delete(page);
      return next;
    });
  };

  const goToPrevious = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentPage(1);
  };

  return (
    <>
      {/* Preview Card */}
      <TouchableOpacity
        onPress={() => setIsModalOpen(true)}
        activeOpacity={0.75}
        style={{
          marginTop: 8,
          marginBottom: 16,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: borderClr,
          backgroundColor: cardBg,
          overflow: 'hidden',
        }}
      >
        
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: iconBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText size={24} color={teal} />
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              variant="label"
              className="font-sans-semibold dark:text-ink-dark"
              numberOfLines={1}
              style={{ fontSize: 14, marginBottom: 2 }}
            >
              {title || 'PDF Document'}
            </Text>
            <Text
              variant="caption"
              style={{
                fontSize: 12,
                color: isDark ? '#636366' : '#8E8E93',
              }}
            >
              {totalPages} {totalPages === 1 ? 'page' : 'pages'} · Tap to view
            </Text>
          </View>

          <FileText size={20} color={teal} />
        </View>
      </TouchableOpacity>

{/* Full Screen PDF Viewer Modal */}
      <Modal
        visible={isModalOpen}
        transparent={false}
        presentationStyle="fullScreen"
        animationType="slide"
        onRequestClose={closeModal}
      >
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
          }}
        >
          {/* Header with Close Button - PROPER LAYOUT */}
          <View
            style={{
              zIndex: 9999,
              elevation: 9999,
              paddingHorizontal: 16,
              paddingBottom: 12,
              // Add dynamic top padding to clear the notch/status bar
              paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 54, 
              borderBottomWidth: 1,
              borderBottomColor: borderClr,
              backgroundColor: cardBg,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: 44,
              }}
            >
              {/* Title - takes remaining space */}
              <Text
                variant="label"
                className="font-sans-semibold"
                numberOfLines={1}
                style={{ 
                  fontSize: 16, 
                  flex: 1,
                  color: isDark ? '#fff' : '#000',
                  marginRight: 12,
                }}
              >
                {title || 'PDF Document'}
              </Text>

              {/* Close Button - RIGHT SIDE, ALWAYS ACCESSIBLE */}
              <TouchableOpacity
                onPress={closeModal}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                style={{
                  padding: 8,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: 8,
                }}
              >
                <X 
                  size={28} 
                  color={isDark ? '#fff' : '#000'} 
                  strokeWidth={2.5}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Page Navigation Bar */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: cardBg,
              borderBottomWidth: 1,
              borderBottomColor: borderClr,
            }}
          >
            <TouchableOpacity
              onPress={goToPrevious}
              disabled={currentPage <= 1}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{ opacity: currentPage <= 1 ? 0.3 : 1 }}
            >
              <ChevronLeft size={24} color={isDark ? '#fff' : '#000'} strokeWidth={2.5} />
            </TouchableOpacity>

            <View style={{ flex: 1, alignItems: 'center', marginHorizontal: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#fff' : '#000' }}>
                Page {currentPage} of {totalPages}
              </Text>
            </View>

            <TouchableOpacity
              onPress={goToNext}
              disabled={currentPage >= totalPages}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{ opacity: currentPage >= totalPages ? 0.3 : 1 }}
            >
              <ChevronRight size={24} color={isDark ? '#fff' : '#000'} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* PDF Pages Viewer */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ alignItems: 'center', paddingVertical: 12 }}
            scrollEnabled={false}
          >
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
              // Only render current page + adjacent pages for efficiency
              if (Math.abs(page - currentPage) > 1) return null;

              const pageUrl = getPdfPageUrl(pdfUrl, page, Math.round(screenWidth - 32));
              const isLoading = loadingPages.has(page);
              const isFailed = failedPages.has(page);
              const isVisible = page === currentPage;
            return (
            <View
                key={page}
                style={{
                width: screenWidth - 32,
                marginBottom: 16,
                borderRadius: 8,
                overflow: 'hidden',
                backgroundColor: '#fff',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 600,
                opacity: isVisible ? 1 : 0,
                display: isVisible ? 'flex' : 'none',
                }}
            >
                {/* Always keep the Image mounted so it can finish loading! */}
                {/* We use opacity: 0 to hide it while it loads or fails */}
                <Image
                source={{ uri: pageUrl }}
                style={{
                    width: '100%',
                    height: 800,
                    opacity: isLoading || isFailed ? 0 : 1, 
                }}
                resizeMode="contain"
                onLoadStart={() => handlePageStart(page)}
                onLoad={() => handlePageLoad(page)}
                onError={(error) => handlePageError(page, error)}
                />

                {/* Display loader on top of the hidden image */}
                {isLoading && (
                <View style={{ position: 'absolute', justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={teal} />
                </View>
                )}
                
                {/* Display error on top of the hidden image */}
                {isFailed && (
                <View style={{ position: 'absolute', alignItems: 'center', padding: 20 }}>
                    <Text style={{ color: red, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
                    Failed to load page {page}
                    </Text>
                    <Text style={{ color: '#666', fontSize: 12 }}>
                    {pageUrl}
                    </Text>
                </View>
                )}
            </View>
            );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}
