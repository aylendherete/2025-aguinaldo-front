import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Autocomplete,
  TextField
} from '@mui/material';
import StarIcon from "@mui/icons-material/Star";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PeopleIcon from "@mui/icons-material/People";
import './RatingsTable.css';

export interface RatingData {
  id: string;
  patientName: string;
  doctorName: string;
  doctorSpecialty?: string;
  score: number;
  subcategories: string[];
  createdAt: string;
}

interface FilterOption {
  id: string;
  name: string;
}

interface RatingsTableProps {
  ratingsData: RatingData[];
  title: string;
  subtitle: string;
  loading: boolean;
  emptyMessage: {
    title: string;
    subtitle: string;
  };

  filterConfig?: {
    filterType: 'doctor' | 'patient';
    filterOptions: FilterOption[];
    selectedFilterId: string;
    onFilterChange: (filterId: string) => void;
    getFilteredTitle: (selectedName?: string) => string;
    getFilteredSubtitle: (selectedName?: string) => string;
    getFilteredEmptyMessage: (selectedName?: string) => { title: string; subtitle: string };
  };
}

export default function RatingsTable({ 
  ratingsData, 
  title, 
  subtitle, 
  loading, 
  emptyMessage,
  filterConfig
}: RatingsTableProps) {
  
  const getRatingScoreClass = (score: number): string => {
    return `rating-score rating-score-${score}`;
  };

  const getDisplayValues = () => {
    if (!filterConfig) {
      return { title, subtitle, emptyMessage };
    }

    const selectedOption = filterConfig.filterOptions.find(
      option => option.id === filterConfig.selectedFilterId
    );
    const selectedName = selectedOption?.name;

    return {
      title: filterConfig.getFilteredTitle(selectedName),
      subtitle: filterConfig.getFilteredSubtitle(selectedName),
      emptyMessage: filterConfig.getFilteredEmptyMessage(selectedName)
    };
  };

  const displayValues = getDisplayValues();

  if (loading) {
    return null;
  }

  return (
    <Box className="ratings-section">
      <Box className="ratings-header">
        <Box>
          <Typography variant="h5" className="ratings-title">
            <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            {displayValues.title}
          </Typography>
          <Typography variant="body2" className="ratings-subtitle">
            {displayValues.subtitle}
          </Typography>
        </Box>
      </Box>

      {/* Filter Section */}
      {filterConfig ? (
        <Box className="ratings-filter-row">
          <Autocomplete
            size="small"
            className="ratings-filter-autocomplete"
            value={filterConfig.filterOptions.find(option => option.id === filterConfig.selectedFilterId) || null}
            onChange={(_, newValue) => {
              filterConfig.onFilterChange(newValue ? newValue.id : 'all');
            }}
            options={[
              { 
                id: 'all', 
                name: filterConfig.filterType === 'doctor' ? 'Todos los Doctores' : 'Todos los Pacientes' 
              },
              ...filterConfig.filterOptions
            ]}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label={`Buscar ${filterConfig.filterType === 'doctor' ? 'Doctor' : 'Paciente'}`}
                placeholder={`Escribe el nombre del ${filterConfig.filterType === 'doctor' ? 'doctor' : 'paciente'}...`}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {option.id === 'all' && <PeopleIcon sx={{ fontSize: 20 }} />}
                {option.name}
              </Box>
            )}
          />
          
          {ratingsData.length > 0 && (
            <Typography variant="body2" className="ratings-count">
              Total: {ratingsData.length} evaluaciones
            </Typography>
          )}
          
          {filterConfig.selectedFilterId !== 'all' && (
            <Chip
              label={`Filtrado: ${filterConfig.filterOptions.find(opt => opt.id === filterConfig.selectedFilterId)?.name}`}
              onDelete={() => filterConfig.onFilterChange('all')}
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
      ) : (
        ratingsData.length > 0 && (
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Typography variant="body2" className="ratings-count">
              Total: {ratingsData.length} evaluaciones
            </Typography>
          </Box>
        )
      )}

      {ratingsData.length === 0 ? (
        <Box className="no-ratings">
          <AssessmentIcon sx={{ fontSize: 48, opacity: 0.3, mb: 2 }} />
          <Typography variant="h6" className="no-ratings-title">
            {displayValues.emptyMessage.title}
          </Typography>
          <Typography variant="body2" className="no-ratings-subtitle">
            {displayValues.emptyMessage.subtitle}
          </Typography>
        </Box>
      ) : (
        <TableContainer className="ratings-table-container">
          <Table className="ratings-table">
            <TableHead>
              <TableRow className="table-header">
                <TableCell className="table-header-cell">Paciente</TableCell>
                <TableCell className="table-header-cell">Doctor</TableCell>
                <TableCell className="table-header-cell" align="center">Puntuación</TableCell>
                <TableCell className="table-header-cell">Subcategorías</TableCell>
                <TableCell className="table-header-cell">Fecha</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ratingsData.map((rating) => (
                <TableRow key={rating.id} className="table-row">
                  <TableCell className="table-cell">
                    <Typography className="patient-name">
                      {rating.patientName}
                    </Typography>
                  </TableCell>
                  
                  <TableCell className="table-cell">
                    <Typography className="doctor-name">
                      {rating.doctorName}
                    </Typography>
                  </TableCell>
                  
                  <TableCell className="table-cell" align="center">
                    <Box className="score-container">
                      <Typography className={getRatingScoreClass(rating.score)}>
                        {rating.score}
                      </Typography>
                      <Box className="stars">
                        {[...Array(5)].map((_, index) => (
                          <StarIcon
                            key={index}
                            className={`star ${index < rating.score ? 'filled' : ''}`}
                          />
                        ))}
                      </Box>
                    </Box>
                  </TableCell>
                  
                  <TableCell className="table-cell">
                    <Box className="subcategories">
                      {rating.subcategories.length > 0 ? (
                        rating.subcategories.map((subcategory, index) => (
                          <Chip
                            key={index}
                            label={subcategory}
                            size="small"
                            className="subcategory-chip"
                          />
                        ))
                      ) : (
                        <Typography variant="caption" className="no-subcategories">
                          Sin subcategorías
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  
                  <TableCell className="table-cell">
                    <Typography className="date">
                      {rating.createdAt}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}