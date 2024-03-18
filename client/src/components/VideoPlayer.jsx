import { useContext } from 'react'
import { Grid, Paper, Typography } from '@mui/material'
import { SocketContext } from '../socketContext'
const VideoPlayer = () => {
  const { callAccepted, myVideo, userVideo, name, callEnded, call } = useContext(SocketContext)
  return (
    <Grid container justifyContent={'center'}>
      {/* Our own video */}
        <Paper>
          <Grid item xs={12} md={6}>
            <Typography variant='h5' gutterBottom>{name}</Typography>
            {myVideo && <video playsInline muted autoPlay ref={myVideo} style={{ width: '550px', }} />}
          </Grid>
        </Paper>
      {/* User's video */}
        <Paper>
          <Grid item xs={12} md={6}>
            <Typography variant='h5' gutterBottom>{call.name || 'Name'}</Typography>
            {userVideo && <video playsInline muted autoPlay ref={userVideo} style={{ width: '550px', }} hidden={!callAccepted}/>}
          </Grid>
        </Paper>
    </Grid>
  )
}

export default VideoPlayer