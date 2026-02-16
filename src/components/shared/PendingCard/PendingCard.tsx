import React from 'react';
import { Card, CardContent, Typography, Avatar, Button, Box } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

interface PendingCardProps {
  id: string | number;
  title: string;
  avatarContent?: React.ReactNode;
  status?: string;
  onApprove: (id: string | number) => void;
  onReject: (id: string | number) => void;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export default function PendingCard(props: PendingCardProps) {
  const {
    id,
    title,
    avatarContent,
    onApprove,
    onReject,
    isLoading = false,
    children
  } = props;

  return (
    <Card sx={{ mb: 2, borderRadius: 2, boxShadow: 2 }}>
      <CardContent
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: { xs: 2, sm: 3 },
          p: { xs: 2, sm: 3 }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, minWidth: 0, width: '100%' }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: { xs: 42, sm: 48 }, height: { xs: 42, sm: 48 }, flexShrink: 0 }}>
            {avatarContent}
          </Avatar>
          <Box sx={{ minWidth: 0, width: '100%', '& .MuiTypography-root': { wordBreak: 'break-word' } }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              {title}
            </Typography>
            {children}
          </Box>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            width: { xs: '100%', sm: 'auto' },
            flexDirection: { xs: 'column', sm: 'row' }
          }}
        >
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckIcon />}
            onClick={() => onApprove(id)}
            disabled={isLoading}
            sx={{ minWidth: { xs: '100%', sm: 100 }, width: { xs: '100%', sm: 'auto' } }}
          >
            Aprobar
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<CloseIcon />}
            onClick={() => onReject(id)}
            disabled={isLoading}
            sx={{ minWidth: { xs: '100%', sm: 100 }, width: { xs: '100%', sm: 'auto' } }}
          >
            Rechazar
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};