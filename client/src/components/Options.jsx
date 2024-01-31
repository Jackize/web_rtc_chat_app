import React, { useContext, useState } from 'react'
import { Button, Container, Grid, Paper, TextField, Typography } from '@mui/material'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { SocketContext } from '../socketContext'
import { Assignment, Phone, PhoneDisabled } from '@mui/icons-material'
const Options = ({ children }) => {
    const { name, callAccepted, me, setName, callEnded, leaveCall, callUser } = useContext(SocketContext)
    const [idToCall, setIdToCall] = useState('')

    return (
        <Container sx={{
            width: '600px',
            margin: '35px 0',
            padding: 0
        }}>
            <Paper elevation={10} sx={{ margin: "10px 20px", border: "2px solid black" }}>
                <form noValidate autoComplete='off' style={{ display: 'flex', flexDirection: "column" }}>
                    <Grid container width={'100%'}>
                        <Grid item xs={12} md={6} padding={2}>
                            <Typography gutterBottom variant='h6'>Account Info</Typography>
                            <TextField label='name' value={name} onChange={(e) => setName(e.target.value)} fullWidth />
                            <CopyToClipboard text={me} style={{ marginTop: '16px' }}>
                                <Button variant='contained' color='primary' fullWidth startIcon={<Assignment fontSize='large' />}>
                                    Coppy your id
                                </Button>
                            </CopyToClipboard>
                        </Grid>
                        <Grid item xs={12} md={6} padding={2}>
                            <Typography gutterBottom variant='h6'>Make a call</Typography>
                            <TextField label='ID to Call' value={idToCall} onChange={(e) => setIdToCall(e.target.value)} fullWidth />
                            {callAccepted && !callEnded ? (
                                <Button variant='contained' color='secondary' startIcon={<PhoneDisabled fontSize='large' />} fullWidth onClick={() => leaveCall()} sx={{ marginTop: 2 }}>
                                    Hang Up
                                </Button>
                            ) : (
                                <Button variant='contained' color='primary' startIcon={<Phone fontSize='large' />} fullWidth onClick={() => callUser(idToCall)} sx={{ marginTop: 2 }}>
                                    Call
                                </Button>
                            )}
                        </Grid>
                    </Grid>
                </form>
                {children}
            </Paper>
        </Container>
    )
}

export default Options